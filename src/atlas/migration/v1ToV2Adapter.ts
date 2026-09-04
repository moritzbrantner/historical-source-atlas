import type {
  AtlasV1MigrationSnapshot,
  V1AgentRow,
  V1CatalogRecordRow,
  V1EntityRow,
  V1TextAnnotationRow,
} from '../server/atlasV1MigrationSnapshot';
import type {
  Annotation,
  Assertion,
  ClaimObject,
  EvidenceSelector,
  Observation,
} from '../domain/v2/evidence';
import { unavailableProvenance } from '../domain/v2/evidence';
import {
  createAtlasEvidenceModel,
  type AtlasEvidenceModel,
} from '../domain/v2/kernel';
import {
  certainty,
  temporalQualification,
  type Certainty,
  type TemporalPrecision,
  type TemporalQualification,
} from '../domain/v2/qualification';
import type {
  DigitalAsset,
  DigitalAssetKind,
  DocumentaryRecord,
  DocumentarySourceKind,
  EditionKind,
  HistoricalEntity,
  SourcePart,
  TextualRecord,
} from '../domain/v2/records';
import {
  compareCodePoints,
  digitalRef,
  documentaryRef,
  evidenceRef,
  historicalRef,
  refKey,
  textualRef,
  type AtlasDomainRef,
  type DocumentaryRef,
  type HistoricalKind,
  type TextualRef,
} from '../domain/v2/reference';

export type AtlasV1MigrationDiagnostic = {
  readonly code: string;
  readonly legacyRef: string;
  readonly message: string;
};

export type AdaptAtlasV1MigrationResult = {
  readonly model: AtlasEvidenceModel;
  readonly diagnostics: readonly AtlasV1MigrationDiagnostic[];
};

type AdapterState = {
  diagnostics: AtlasV1MigrationDiagnostic[];
  entityById: ReadonlyMap<string, V1EntityRow>;
  refByEntityId: Map<string, AtlasDomainRef>;
};

const unavailableLegacyProvenance =
  'Legacy v1 storage does not link this claim to a v2 evidence item.';

export function adaptAtlasV1SnapshotToV2(
  snapshot: AtlasV1MigrationSnapshot,
): AdaptAtlasV1MigrationResult {
  const state: AdapterState = {
    diagnostics: [],
    entityById: new Map(snapshot.entities.map((entity) => [entity.id, entity])),
    refByEntityId: new Map(),
  };

  const documentary = adaptDocumentary(snapshot, state);
  const historical = adaptHistorical(snapshot, state);
  const textual = adaptTextual(snapshot, state);
  const digital = adaptDigital(snapshot, state);
  const { annotations, observations, mentionAssertions } = adaptEvidence(
    snapshot,
    state,
  );
  const assertions = [
    ...mentionAssertions,
    ...adaptEntityRelations(snapshot, state),
    ...adaptQualifiedLegacyClaims(snapshot, state),
  ];

  return Object.freeze({
    model: createAtlasEvidenceModel({
      documentary,
      textual,
      historical,
      observations,
      annotations,
      assertions,
      digital,
    }),
    diagnostics: Object.freeze(sortDiagnostics(state.diagnostics)),
  });
}

function adaptDocumentary(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): DocumentaryRecord[] {
  const records: DocumentaryRecord[] = [];
  const catalogById = new Map(
    snapshot.catalogRecords.map((record) => [record.id, record]),
  );
  const linksByEntityId = groupBy(
    snapshot.catalogRecordLinks,
    (link) => link.entityId,
  );

  for (const record of snapshot.catalogRecords) {
    const entity = state.entityById.get(record.entityId);
    if (!entity) {
      diagnostic(
        state,
        'missing-catalog-entity',
        `catalog-record:${record.id}`,
        'Catalog record has no entity identity and was not migrated.',
      );
      continue;
    }

    const ref = documentaryRef('source', entity.slug);
    records.push({
      ref,
      label: record.displayTitle,
      sourceKind: mapDocumentarySourceKind(record.kind),
      ...optionalText('summary', record.publicSummary ?? entity.summary),
    });
    state.refByEntityId.set(entity.id, ref);
  }

  const physicalObjectEntityById = new Map(
    snapshot.physicalObjects.map((row) => [row.id, row.entityId]),
  );
  const partEntityById = new Map(
    snapshot.objectParts.map((row) => [row.id, row.entityId]),
  );

  for (const physicalObject of snapshot.physicalObjects) {
    const entity = state.entityById.get(physicalObject.entityId);
    if (!entity) {
      continue;
    }

    const sourceParent = resolveCatalogParent(
      linksByEntityId.get(entity.id) ?? [],
      catalogById,
      state,
      `physical-object:${physicalObject.id}`,
    );
    if (!sourceParent) {
      continue;
    }

    const ref = documentaryRef('source-part', entity.slug);
    records.push(sourcePart(entity, ref, sourceParent));
    state.refByEntityId.set(entity.id, ref);
  }

  const pendingParts = [...snapshot.objectParts];
  let progressed = true;
  while (pendingParts.length > 0 && progressed) {
    progressed = false;
    for (let index = pendingParts.length - 1; index >= 0; index -= 1) {
      const part = pendingParts[index];
      const entity = state.entityById.get(part.entityId);
      const parentEntityId = part.parentPartId
        ? partEntityById.get(part.parentPartId)
        : physicalObjectEntityById.get(part.physicalObjectId);
      const parent = parentEntityId
        ? asDocumentaryRef(state.refByEntityId.get(parentEntityId))
        : null;

      if (!entity || !parent) {
        continue;
      }

      const ref = documentaryRef('source-part', entity.slug);
      records.push(
        sourcePart(
          {
            ...entity,
            preferredLabel: part.label?.trim() || entity.preferredLabel,
          },
          ref,
          parent,
        ),
      );
      state.refByEntityId.set(entity.id, ref);
      pendingParts.splice(index, 1);
      progressed = true;
    }
  }

  for (const part of pendingParts) {
    diagnostic(
      state,
      'unresolved-source-part-parent',
      `object-part:${part.id}`,
      'Object part parent could not be mapped without guessing.',
    );
  }

  for (const row of [...snapshot.inscriptions, ...snapshot.manuscriptUnits]) {
    const entity = state.entityById.get(row.entityId);
    const parentEntityId =
      'objectPartId' in row && row.objectPartId
        ? partEntityById.get(row.objectPartId)
        : physicalObjectEntityById.get(row.physicalObjectId);
    const parent = parentEntityId
      ? asDocumentaryRef(state.refByEntityId.get(parentEntityId))
      : null;
    if (!entity || !parent) {
      diagnostic(
        state,
        'unresolved-documentary-carrier-parent',
        `${'objectPartId' in row ? 'inscription' : 'manuscript-unit'}:${row.id}`,
        'Documentary carrier parent could not be mapped without guessing.',
      );
      continue;
    }

    const ref = documentaryRef('source-part', entity.slug);
    records.push(sourcePart(entity, ref, parent));
    state.refByEntityId.set(entity.id, ref);
  }

  return records;
}

function sourcePart(
  entity: V1EntityRow,
  ref: DocumentaryRef<'source-part'>,
  parent: DocumentaryRef,
): SourcePart {
  return {
    ref,
    label: entity.preferredLabel,
    parent,
    ...optionalText('summary', entity.summary),
  };
}

function resolveCatalogParent(
  links: readonly AtlasV1MigrationSnapshot['catalogRecordLinks'][number][],
  catalogById: ReadonlyMap<string, V1CatalogRecordRow>,
  state: AdapterState,
  legacyRef: string,
): DocumentaryRef<'source'> | null {
  const candidateRefs = links
    .map((link) => catalogById.get(link.catalogRecordId))
    .filter((record): record is V1CatalogRecordRow => Boolean(record))
    .map((record) => state.refByEntityId.get(record.entityId))
    .filter(
      (ref): ref is DocumentaryRef<'source'> =>
        ref?.space === 'documentary' && ref.kind === 'source',
    );

  const unique = new Map(candidateRefs.map((ref) => [refKey(ref), ref]));
  if (unique.size === 1) {
    return [...unique.values()][0];
  }

  diagnostic(
    state,
    unique.size === 0
      ? 'missing-documentary-parent'
      : 'ambiguous-documentary-parent',
    legacyRef,
    unique.size === 0
      ? 'No catalog-record parent is available for this documentary carrier.'
      : 'Multiple catalog-record parents exist; migration refuses to choose one.',
  );
  return null;
}

function adaptHistorical(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): HistoricalEntity[] {
  const agentByEntityId = new Map(
    snapshot.agents.map((row) => [row.entityId, row]),
  );
  const records: HistoricalEntity[] = [];

  for (const entity of snapshot.entities) {
    let kind: HistoricalKind | null = null;
    if (entity.type === 'place') {
      kind = 'place';
    } else if (entity.type === 'event') {
      kind = 'event';
    } else if (entity.type === 'agent') {
      kind = mapHistoricalAgentKind(agentByEntityId.get(entity.id));
    }

    if (!kind) {
      continue;
    }

    const ref = historicalRef(kind, entity.slug);
    records.push({
      ref,
      label: entity.preferredLabel,
      ...optionalText('summary', entity.summary),
    });
    state.refByEntityId.set(entity.id, ref);
  }

  return records;
}

function adaptTextual(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): TextualRecord[] {
  const records: TextualRecord[] = [];
  const workRefById = new Map<string, TextualRef<'work'>>();
  const witnessRefById = new Map<string, TextualRef<'witness'>>();
  const editionRefById = new Map<string, TextualRef<'edition'>>();

  for (const work of snapshot.textWorks) {
    const entity = state.entityById.get(work.entityId);
    if (!entity) {
      continue;
    }
    const ref = textualRef('work', entity.slug);
    records.push({
      ref,
      label: work.canonicalTitle,
      ...optionalText('summary', work.abstract ?? entity.summary),
    });
    workRefById.set(work.id, ref);
    state.refByEntityId.set(entity.id, ref);
  }

  const physicalEntityById = new Map(
    snapshot.physicalObjects.map((row) => [row.id, row.entityId]),
  );
  const inscriptionEntityById = new Map(
    snapshot.inscriptions.map((row) => [row.id, row.entityId]),
  );
  const manuscriptEntityById = new Map(
    snapshot.manuscriptUnits.map((row) => [row.id, row.entityId]),
  );

  for (const witness of snapshot.textWitnesses) {
    const entity = state.entityById.get(witness.entityId);
    const work = witness.textWorkId
      ? workRefById.get(witness.textWorkId)
      : null;
    const carrierEntityIds = [
      witness.physicalObjectId
        ? physicalEntityById.get(witness.physicalObjectId)
        : undefined,
      witness.inscriptionId
        ? inscriptionEntityById.get(witness.inscriptionId)
        : undefined,
      witness.manuscriptUnitId
        ? manuscriptEntityById.get(witness.manuscriptUnitId)
        : undefined,
    ].filter((value): value is string => Boolean(value));
    const carrierRefs = carrierEntityIds
      .map((entityId) => asDocumentaryRef(state.refByEntityId.get(entityId)))
      .filter((ref): ref is DocumentaryRef => Boolean(ref));

    if (!entity || !work || carrierRefs.length !== 1) {
      diagnostic(
        state,
        'unmappable-text-witness',
        `text-witness:${witness.id}`,
        'Text witness requires one mapped work and exactly one mapped documentary carrier.',
      );
      continue;
    }

    const ref = textualRef('witness', entity.slug);
    records.push({
      ref,
      label: witness.siglum?.trim() || entity.preferredLabel,
      work,
      carrier: carrierRefs[0],
    });
    witnessRefById.set(witness.id, ref);
    state.refByEntityId.set(entity.id, ref);
  }

  for (const edition of snapshot.textEditions) {
    const entity = state.entityById.get(edition.entityId);
    const witness = witnessRefById.get(edition.textWitnessId);
    if (!entity || !witness) {
      diagnostic(
        state,
        'unmappable-text-edition',
        `text-edition:${edition.id}`,
        'Text edition has no mapped witness.',
      );
      continue;
    }

    const ref = textualRef('edition', entity.slug);
    records.push({
      ref,
      label: edition.versionLabel?.trim() || entity.preferredLabel,
      witness,
      editionKind: mapEditionKind(edition.editionType),
    });
    editionRefById.set(edition.id, ref);
    state.refByEntityId.set(entity.id, ref);
  }

  const unitRefById = new Map<string, TextualRef<'text-unit'>>();
  for (const unit of snapshot.textUnits) {
    if (editionRefById.has(unit.textEditionId)) {
      unitRefById.set(unit.id, textualRef('text-unit', unit.id));
    }
  }

  for (const unit of snapshot.textUnits) {
    const edition = editionRefById.get(unit.textEditionId);
    const ref = unitRefById.get(unit.id);
    const parent = unit.parentUnitId
      ? unitRefById.get(unit.parentUnitId)
      : undefined;
    if (!edition || !ref || (unit.parentUnitId && !parent)) {
      diagnostic(
        state,
        'unmappable-text-unit',
        `text-unit:${unit.id}`,
        'Text unit has no mapped edition or parent unit.',
      );
      continue;
    }

    records.push({
      ref,
      edition,
      ...(parent ? { parent } : {}),
      ...(unit.label?.trim() ? { label: unit.label.trim() } : {}),
      sequence: unit.sequence,
    });
  }

  return records;
}

function adaptDigital(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): DigitalAsset[] {
  const records: DigitalAsset[] = [];
  for (const asset of snapshot.assets) {
    const entity = state.entityById.get(asset.entityId);
    if (!entity) {
      continue;
    }
    const ref = digitalRef('asset', entity.slug);
    records.push({
      ref,
      assetKind: mapDigitalAssetKind(asset.assetKind),
      ...(asset.originalFilename?.trim()
        ? { label: asset.originalFilename.trim() }
        : {}),
      ...(asset.sourceUrl?.trim() ? { sourceUrl: asset.sourceUrl.trim() } : {}),
    });
    state.refByEntityId.set(entity.id, ref);
  }
  return records;
}

function adaptEvidence(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): {
  annotations: Annotation[];
  observations: Observation[];
  mentionAssertions: Assertion[];
} {
  const annotations: Annotation[] = [];
  const observations: Observation[] = [];
  const mentionAssertions: Assertion[] = [];
  const unitRefs = new Map(
    snapshot.textUnits.map((unit) => [
      unit.id,
      textualRef('text-unit', unit.id),
    ]),
  );
  const mappedTextUnitRefs = new Set(
    adaptTextUnitKeysFromState(snapshot, state),
  );

  for (const row of snapshot.textAnnotations) {
    const target = unitRefs.get(row.textUnitId);
    if (!target || !mappedTextUnitRefs.has(refKey(target))) {
      diagnostic(
        state,
        'annotation-target-unmapped',
        `text-annotation:${row.id}`,
        'Text annotation target was not migrated.',
      );
      continue;
    }

    const content = row.content?.trim();
    if (!content) {
      diagnostic(
        state,
        'annotation-content-unavailable',
        `text-annotation:${row.id}`,
        'Legacy text annotation has no content; it remains only as a migration diagnostic.',
      );
      continue;
    }

    const selector = evidenceSelector(row, target, state);
    annotations.push({
      ref: evidenceRef('annotation', row.id),
      target,
      ...(selector ? { selector } : {}),
      annotationKind: mapAnnotationKind(row.annotationType),
      content,
    });

    if (row.certainty?.trim()) {
      diagnostic(
        state,
        'annotation-certainty-unmapped',
        `text-annotation:${row.id}`,
        `Annotation certainty is preserved only in diagnostics: ${row.certainty.trim()}`,
      );
    }
  }

  for (const row of snapshot.entityMentions) {
    const target = unitRefs.get(row.textUnitId);
    if (!target || !mappedTextUnitRefs.has(refKey(target))) {
      diagnostic(
        state,
        'mention-target-unmapped',
        `entity-mention:${row.id}`,
        'Entity mention target text unit was not migrated.',
      );
      continue;
    }

    const selector = evidenceSelector(row, target, state);
    const observationRef = evidenceRef('observation', `mention:${row.id}`);
    observations.push({
      ref: observationRef,
      target,
      ...(selector ? { selector } : {}),
      ...optionalText(
        'note',
        joinLegacyNotes(row.source, row.note, row.mentionText),
      ),
    });

    const objectRef = state.refByEntityId.get(row.entityId);
    if (
      !objectRef ||
      objectRef.space === 'evidence' ||
      objectRef.space === 'digital'
    ) {
      diagnostic(
        state,
        'mention-entity-unmapped',
        `entity-mention:${row.id}`,
        'Mentioned entity has no claim-compatible v2 identity.',
      );
      continue;
    }

    mentionAssertions.push({
      ref: evidenceRef('assertion', `mention:${row.id}`),
      subject: target,
      predicate: 'mentions',
      object: { kind: 'reference', ref: objectRef },
      ...optionalCertainty(row.certainty),
      provenance: {
        status: 'known',
        evidence: [{ evidence: observationRef, stance: 'supports' }],
      },
    });
  }

  return { annotations, observations, mentionAssertions };
}

function adaptTextUnitKeysFromState(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): string[] {
  const mappedEditionEntityIds = new Set(
    snapshot.textEditions
      .filter((edition) => state.refByEntityId.has(edition.entityId))
      .map((edition) => edition.id),
  );
  return snapshot.textUnits
    .filter((unit) => mappedEditionEntityIds.has(unit.textEditionId))
    .map((unit) => refKey(textualRef('text-unit', unit.id)));
}

function adaptEntityRelations(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): Assertion[] {
  const assertions: Assertion[] = [];

  for (const relation of snapshot.entityRelations) {
    const subject = claimSubject(
      state.refByEntityId.get(relation.subjectEntityId),
    );
    if (!subject) {
      diagnostic(
        state,
        'relation-subject-unmapped',
        `entity-relation:${relation.id}`,
        'Relation subject has no claim-compatible v2 identity.',
      );
      continue;
    }

    const object = relationObject(relation, state);
    if (!object) {
      diagnostic(
        state,
        'relation-object-unmapped',
        `entity-relation:${relation.id}`,
        'Relation object cannot be represented without guessing.',
      );
      continue;
    }

    if (relation.objectUrl?.trim() && relation.objectLabel?.trim()) {
      diagnostic(
        state,
        'relation-object-url-unmapped',
        `entity-relation:${relation.id}`,
        `Relation object URL is not represented in the current v2 claim object: ${relation.objectUrl.trim()}`,
      );
    }
    if (relation.bibliographicItemId) {
      diagnostic(
        state,
        'relation-bibliography-unmapped',
        `entity-relation:${relation.id}`,
        'Legacy bibliographic provenance is not yet represented as a v2 evidence item.',
      );
    }

    assertions.push({
      ref: evidenceRef('assertion', `relation:${relation.id}`),
      subject,
      predicate: relation.predicate,
      object,
      ...optionalCertainty(relation.certainty),
      provenance: unavailableProvenance(unavailableLegacyProvenance),
    });
  }

  return assertions;
}

function adaptQualifiedLegacyClaims(
  snapshot: AtlasV1MigrationSnapshot,
  state: AdapterState,
): Assertion[] {
  const assertions: Assertion[] = [];
  const placeEntityByPlaceId = new Map(
    snapshot.places.map((row) => [row.id, row.entityId]),
  );
  const eventEntityByEventId = new Map(
    snapshot.events.map((row) => [row.id, row.entityId]),
  );

  for (const record of snapshot.catalogRecords) {
    const subject = claimSubject(state.refByEntityId.get(record.entityId));
    if (!subject) {
      continue;
    }

    appendPlaceAssertion(
      assertions,
      state,
      `catalog:${record.id}:primary-place`,
      subject,
      'associated-place',
      record.primaryPlaceId,
      placeEntityByPlaceId,
    );
    appendTemporalAssertion(
      assertions,
      state,
      `catalog:${record.id}:primary-date`,
      subject,
      'dated-to',
      record.primaryDateStartYear,
      record.primaryDateEndYear,
      record.primaryDateLabel,
      'unknown',
    );

    if (record.discoveryEventId) {
      const eventEntityId = eventEntityByEventId.get(record.discoveryEventId);
      const eventRef = eventEntityId
        ? claimObjectRef(state.refByEntityId.get(eventEntityId))
        : null;
      if (eventRef) {
        assertions.push({
          ref: evidenceRef('assertion', `catalog:${record.id}:discovery-event`),
          subject,
          predicate: 'discovered-in',
          object: { kind: 'reference', ref: eventRef },
          provenance: unavailableProvenance(unavailableLegacyProvenance),
        });
      }
    }
  }

  for (const event of snapshot.events) {
    const subject = claimSubject(state.refByEntityId.get(event.entityId));
    if (!subject) {
      continue;
    }
    appendTemporalAssertion(
      assertions,
      state,
      `event:${event.id}:date`,
      subject,
      'occurred-during',
      event.dateStartYear,
      event.dateEndYear,
      event.dateLabel,
      event.datePrecision,
    );
    appendPlaceAssertion(
      assertions,
      state,
      `event:${event.id}:place`,
      subject,
      'occurred-at',
      event.placeId,
      placeEntityByPlaceId,
    );
  }

  for (const agent of snapshot.agents) {
    const subject = claimSubject(state.refByEntityId.get(agent.entityId));
    if (!subject) {
      continue;
    }
    appendTemporalAssertion(
      assertions,
      state,
      `agent:${agent.id}:date`,
      subject,
      'active-during',
      agent.dateStartYear,
      agent.dateEndYear,
      agent.dateLabel,
      agent.datePrecision,
    );
  }

  for (const work of snapshot.textWorks) {
    const subject = claimSubject(state.refByEntityId.get(work.entityId));
    if (!subject) {
      continue;
    }
    appendTemporalAssertion(
      assertions,
      state,
      `text-work:${work.id}:date`,
      subject,
      'dated-to',
      work.dateStartYear,
      work.dateEndYear,
      work.dateLabel,
      'unknown',
    );
  }

  for (const witness of snapshot.textWitnesses) {
    const subject = claimSubject(state.refByEntityId.get(witness.entityId));
    if (!subject) {
      continue;
    }
    appendTemporalAssertion(
      assertions,
      state,
      `text-witness:${witness.id}:date`,
      subject,
      'dated-to',
      witness.dateStartYear,
      witness.dateEndYear,
      witness.dateLabel,
      'unknown',
    );
  }

  return assertions;
}

function appendPlaceAssertion(
  assertions: Assertion[],
  state: AdapterState,
  id: string,
  subject: Assertion['subject'],
  predicate: string,
  placeId: string | null,
  placeEntityByPlaceId: ReadonlyMap<string, string>,
): void {
  if (!placeId) {
    return;
  }
  const entityId = placeEntityByPlaceId.get(placeId);
  const objectRef = entityId
    ? claimObjectRef(state.refByEntityId.get(entityId))
    : null;
  if (!objectRef) {
    diagnostic(
      state,
      'place-claim-unmapped',
      id,
      'Legacy place claim references a place that was not migrated.',
    );
    return;
  }

  assertions.push({
    ref: evidenceRef('assertion', id),
    subject,
    predicate,
    object: { kind: 'reference', ref: objectRef },
    provenance: unavailableProvenance(unavailableLegacyProvenance),
  });
}

function appendTemporalAssertion(
  assertions: Assertion[],
  state: AdapterState,
  id: string,
  subject: Assertion['subject'],
  predicate: string,
  startYear: number | null,
  endYear: number | null,
  label: string | null,
  precision: string,
): void {
  const temporal = legacyTemporal(
    startYear,
    endYear,
    label,
    precision,
    state,
    id,
  );
  if (!temporal) {
    return;
  }

  const object = temporalClaimObject(startYear, endYear, label);
  if (!object) {
    return;
  }

  assertions.push({
    ref: evidenceRef('assertion', id),
    subject,
    predicate,
    object,
    validDuring: temporal,
    provenance: unavailableProvenance(unavailableLegacyProvenance),
  });
}

function temporalClaimObject(
  startYear: number | null,
  endYear: number | null,
  label: string | null,
): ClaimObject | null {
  if (label?.trim()) {
    return {
      kind: 'literal',
      value: { kind: 'string', value: label.trim() },
    };
  }
  const year = nonZeroYear(startYear) ?? nonZeroYear(endYear);
  return year === undefined
    ? null
    : { kind: 'literal', value: { kind: 'number', value: year } };
}

function legacyTemporal(
  startYear: number | null,
  endYear: number | null,
  label: string | null,
  precision: string,
  state: AdapterState,
  legacyRef: string,
): TemporalQualification | null {
  if (startYear === null && endYear === null && !label?.trim()) {
    return null;
  }
  if (startYear === 0 || endYear === 0) {
    diagnostic(
      state,
      'legacy-zero-year',
      legacyRef,
      'Zero-valued legacy year is not treated as historical data.',
    );
  }

  const start = nonZeroYear(startYear);
  const end = nonZeroYear(endYear);
  if (start !== undefined && end !== undefined && start > end) {
    diagnostic(
      state,
      'invalid-legacy-date-range',
      legacyRef,
      'Legacy date range is reversed and was not migrated.',
    );
    return null;
  }

  return temporalQualification({
    ...(start !== undefined ? { startYear: start } : {}),
    ...(end !== undefined ? { endYear: end } : {}),
    ...(label?.trim() ? { label: label.trim() } : {}),
    precision: mapTemporalPrecision(precision),
  });
}

function evidenceSelector(
  row: Pick<V1TextAnnotationRow, 'id' | 'startOffset' | 'endOffset'>,
  unit: TextualRef<'text-unit'>,
  state: AdapterState,
): EvidenceSelector | undefined {
  if (row.startOffset === null && row.endOffset === null) {
    return undefined;
  }
  if (
    row.startOffset === null ||
    row.endOffset === null ||
    row.startOffset < 0 ||
    row.endOffset < row.startOffset
  ) {
    diagnostic(
      state,
      'invalid-evidence-offsets',
      `evidence:${row.id}`,
      'Legacy evidence offsets are incomplete or invalid; target is preserved without a selector.',
    );
    return undefined;
  }

  return {
    kind: 'text-range',
    unit,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
  };
}

function relationObject(
  relation: AtlasV1MigrationSnapshot['entityRelations'][number],
  state: AdapterState,
): ClaimObject | null {
  if (relation.objectEntityId) {
    const ref = claimObjectRef(
      state.refByEntityId.get(relation.objectEntityId),
    );
    if (ref) {
      return { kind: 'reference', ref };
    }
  }

  const literal = relation.objectLabel?.trim() || relation.objectUrl?.trim();
  return literal
    ? { kind: 'literal', value: { kind: 'string', value: literal } }
    : null;
}

function claimSubject(
  ref: AtlasDomainRef | undefined,
): Assertion['subject'] | null {
  if (!ref || ref.space === 'evidence' || ref.space === 'digital') {
    return null;
  }
  return ref;
}

function claimObjectRef(
  ref: AtlasDomainRef | undefined,
): Exclude<
  AtlasDomainRef,
  { space: 'evidence' } | { space: 'digital' }
> | null {
  if (!ref || ref.space === 'evidence' || ref.space === 'digital') {
    return null;
  }
  return ref;
}

function asDocumentaryRef(
  ref: AtlasDomainRef | undefined,
): DocumentaryRef | null {
  return ref?.space === 'documentary' ? ref : null;
}

function mapDocumentarySourceKind(kind: string): DocumentarySourceKind {
  switch (kind) {
    case 'artifact':
    case 'inscription':
    case 'manuscript':
    case 'archive':
    case 'collection':
      return kind;
    default:
      return 'other';
  }
}

function mapHistoricalAgentKind(agent: V1AgentRow | undefined): HistoricalKind {
  const kind = agent?.agentType.trim().toLowerCase() ?? '';
  if (['person', 'author', 'scribe', 'editor'].includes(kind)) {
    return 'person';
  }
  if (['group', 'community'].includes(kind)) {
    return 'group';
  }
  if (
    [
      'institution',
      'repository',
      'library',
      'archive',
      'museum',
      'church',
    ].includes(kind)
  ) {
    return 'institution';
  }
  if (kind === 'polity') {
    return 'polity';
  }
  return 'other';
}

function mapEditionKind(kind: string): EditionKind {
  switch (kind) {
    case 'transcription':
    case 'transliteration':
    case 'translation':
    case 'commentary':
      return kind;
    case 'normalized_text':
      return 'normalized-text';
    default:
      return 'commentary';
  }
}

function mapDigitalAssetKind(kind: string): DigitalAssetKind {
  switch (kind) {
    case 'image':
    case 'pdf':
    case 'scan':
    case 'ocr':
    case 'other':
      return kind;
    case 'iiif_manifest':
      return 'iiif-manifest';
    case 'derivative':
      return 'derived';
    default:
      return 'other';
  }
}

function mapAnnotationKind(type: string): Annotation['annotationKind'] {
  switch (type.trim().toLowerCase()) {
    case 'note':
    case 'commentary':
      return 'note';
    case 'translation':
      return 'translation';
    case 'transcription':
    case 'transliteration':
      return 'transcription';
    case 'entity-mention':
    case 'entity_mention':
      return 'entity-mention';
    default:
      return 'other';
  }
}

function mapTemporalPrecision(value: string): TemporalPrecision {
  switch (value.trim().toLowerCase()) {
    case 'exact':
    case 'year':
    case 'range':
    case 'century':
    case 'circa':
    case 'unknown':
      return value.trim().toLowerCase() as TemporalPrecision;
    default:
      return 'unknown';
  }
}

function optionalCertainty(
  value: string | null,
): { certainty: Certainty } | {} {
  const normalized = value?.trim();
  if (!normalized) {
    return {};
  }
  const level = normalized.toLowerCase();
  if (
    level === 'certain' ||
    level === 'probable' ||
    level === 'possible' ||
    level === 'uncertain' ||
    level === 'unknown'
  ) {
    return { certainty: certainty(level) };
  }
  return { certainty: certainty('unknown', normalized) };
}

function nonZeroYear(value: number | null): number | undefined {
  return value === null || value === 0 ? undefined : value;
}

function optionalText<TKey extends string>(
  key: TKey,
  value: string | null | undefined,
): { [K in TKey]?: string } {
  const normalized = value?.trim();
  return normalized ? ({ [key]: normalized } as { [K in TKey]?: string }) : {};
}

function joinLegacyNotes(...values: readonly (string | null)[]): string | null {
  const parts = values.map((value) => value?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : null;
}

function diagnostic(
  state: AdapterState,
  code: string,
  legacyRef: string,
  message: string,
): void {
  state.diagnostics.push({ code, legacyRef, message });
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

function groupBy<T>(
  values: readonly T[],
  key: (value: T) => string,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const valueKey = key(value);
    const group = grouped.get(valueKey) ?? [];
    group.push(value);
    grouped.set(valueKey, group);
  }
  return grouped;
}
