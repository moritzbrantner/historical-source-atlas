import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';
import { compareCodePoints } from '../domain/v2/reference';
import {
  adaptAtlasV1SnapshotToV2,
  type AdaptAtlasV1MigrationResult,
  type AtlasV1MigrationDiagnostic,
} from './v1ToV2Adapter';

const supportedEditionTypes = new Set([
  'transcription',
  'transliteration',
  'normalized_text',
  'translation',
  'commentary',
]);

export function adaptAtlasV1SnapshotStrictlyToV2(
  snapshot: AtlasV1MigrationSnapshot,
): AdaptAtlasV1MigrationResult {
  const prepared = prepareAtlasV1SnapshotForV2(snapshot);
  const adapted = adaptAtlasV1SnapshotToV2(prepared.snapshot);
  const preservedUnmapped = collectPreservedUnmappedDiagnostics(snapshot);

  return Object.freeze({
    model: adapted.model,
    diagnostics: Object.freeze(
      sortDiagnostics([
        ...prepared.diagnostics,
        ...adapted.diagnostics,
        ...preservedUnmapped,
      ]),
    ),
  });
}

export function collectPreservedUnmappedDiagnostics(
  snapshot: AtlasV1MigrationSnapshot,
): readonly AtlasV1MigrationDiagnostic[] {
  const diagnostics: AtlasV1MigrationDiagnostic[] = [];

  for (const place of snapshot.places) {
    if (place.geometryGeoJson !== null) {
      diagnostics.push({
        code: 'place-geometry-unmapped',
        legacyRef: `place:${place.id}`,
        message:
          'Legacy place geometry is preserved in the migration snapshot but is not copied onto a historical entity; geometry must remain an evidence-backed projection concern.',
      });
    }
  }

  for (const unit of snapshot.textUnits) {
    const preservedFields = [
      unit.content?.trim() ? 'content' : null,
      unit.normalizedContent?.trim() ? 'normalizedContent' : null,
      unit.note?.trim() ? 'note' : null,
    ].filter((value): value is string => value !== null);

    if (preservedFields.length > 0) {
      diagnostics.push({
        code: 'text-unit-content-unmapped',
        legacyRef: `text-unit:${unit.id}`,
        message: `Legacy text-unit ${preservedFields.join(', ')} is preserved in the migration snapshot but is not represented by the current structural v2 TextUnit record.`,
      });
    }
  }

  return Object.freeze(sortDiagnostics(diagnostics));
}

export function prepareAtlasV1SnapshotForV2(
  snapshot: AtlasV1MigrationSnapshot,
): {
  readonly snapshot: AtlasV1MigrationSnapshot;
  readonly diagnostics: readonly AtlasV1MigrationDiagnostic[];
} {
  const diagnostics: AtlasV1MigrationDiagnostic[] = [];
  const supportedEditions = snapshot.textEditions.filter((edition) => {
    if (supportedEditionTypes.has(edition.editionType)) {
      return true;
    }

    diagnostics.push({
      code: 'unsupported-edition-kind',
      legacyRef: `text-edition:${edition.id}`,
      message: `Unsupported legacy edition kind was not guessed: ${edition.editionType}`,
    });
    return false;
  });
  const supportedEditionIds = new Set(
    supportedEditions.map((edition) => edition.id),
  );
  const unitById = new Map(snapshot.textUnits.map((unit) => [unit.id, unit]));
  const validity = new Map<string, boolean>();

  function isStructurallyValidUnit(
    unitId: string,
    visiting = new Set<string>(),
  ): boolean {
    const cached = validity.get(unitId);
    if (cached !== undefined) {
      return cached;
    }

    const unit = unitById.get(unitId);
    if (
      !unit ||
      !supportedEditionIds.has(unit.textEditionId) ||
      visiting.has(unitId)
    ) {
      validity.set(unitId, false);
      return false;
    }

    if (!unit.parentUnitId) {
      validity.set(unitId, true);
      return true;
    }

    const parent = unitById.get(unit.parentUnitId);
    if (!parent || parent.textEditionId !== unit.textEditionId) {
      validity.set(unitId, false);
      return false;
    }

    const nextVisiting = new Set(visiting);
    nextVisiting.add(unitId);
    const valid = isStructurallyValidUnit(parent.id, nextVisiting);
    validity.set(unitId, valid);
    return valid;
  }

  const supportedTextUnits = snapshot.textUnits.filter((unit) => {
    if (isStructurallyValidUnit(unit.id)) {
      return true;
    }

    diagnostics.push({
      code: supportedEditionIds.has(unit.textEditionId)
        ? 'invalid-text-unit-ancestry'
        : 'text-unit-edition-unmapped',
      legacyRef: `text-unit:${unit.id}`,
      message: supportedEditionIds.has(unit.textEditionId)
        ? 'Text unit parent ancestry is missing, cyclic, or crosses edition boundaries; migration refuses to guess a parent.'
        : 'Text unit belongs to an unsupported edition and was not migrated.',
    });
    return false;
  });
  const supportedTextUnitIds = new Set(
    supportedTextUnits.map((unit) => unit.id),
  );

  const textAnnotations = snapshot.textAnnotations.filter((annotation) => {
    if (supportedTextUnitIds.has(annotation.textUnitId)) {
      return true;
    }

    diagnostics.push({
      code: 'annotation-target-unmapped',
      legacyRef: `text-annotation:${annotation.id}`,
      message:
        'Raw legacy annotation is preserved in the snapshot, but its text-unit target cannot be migrated safely.',
    });
    return false;
  });
  const entityMentions = snapshot.entityMentions.filter((mention) => {
    if (supportedTextUnitIds.has(mention.textUnitId)) {
      return true;
    }

    diagnostics.push({
      code: 'mention-target-unmapped',
      legacyRef: `entity-mention:${mention.id}`,
      message:
        'Raw legacy mention is preserved in the snapshot, but its text-unit target cannot be migrated safely.',
    });
    return false;
  });

  return Object.freeze({
    snapshot: {
      ...snapshot,
      textEditions: supportedEditions,
      textUnits: supportedTextUnits,
      textAnnotations,
      entityMentions,
    },
    diagnostics: Object.freeze(sortDiagnostics(diagnostics)),
  });
}

function sortDiagnostics(
  diagnostics: readonly AtlasV1MigrationDiagnostic[],
): AtlasV1MigrationDiagnostic[] {
  return [...diagnostics].sort((left, right) =>
    compareCodePoints(
      JSON.stringify([left.code, left.legacyRef, left.message]),
      JSON.stringify([right.code, right.legacyRef, right.message]),
    ),
  );
}
