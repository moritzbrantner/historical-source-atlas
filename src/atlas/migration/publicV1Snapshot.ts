import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';

/**
 * Restricts a legacy v1 snapshot to publicly visible records before it is
 * adapted for unauthenticated read surfaces: unpublished catalog records and
 * non-public text editions are removed together with the rows that hang off
 * them (catalog links, text units, annotations, and entity mentions).
 */
export function selectPublicAtlasV1Snapshot(
  snapshot: AtlasV1MigrationSnapshot,
): AtlasV1MigrationSnapshot {
  const catalogRecords = snapshot.catalogRecords.filter(
    (record) => record.published,
  );
  const publicCatalogRecordIds = new Set(
    catalogRecords.map((record) => record.id),
  );
  const textEditions = snapshot.textEditions.filter(
    (edition) => edition.isPublic,
  );
  const publicEditionIds = new Set(textEditions.map((edition) => edition.id));
  const textUnits = snapshot.textUnits.filter((unit) =>
    publicEditionIds.has(unit.textEditionId),
  );
  const publicUnitIds = new Set(textUnits.map((unit) => unit.id));

  return {
    ...snapshot,
    catalogRecords,
    catalogRecordLinks: snapshot.catalogRecordLinks.filter((link) =>
      publicCatalogRecordIds.has(link.catalogRecordId),
    ),
    textEditions,
    textUnits,
    textAnnotations: snapshot.textAnnotations.filter((annotation) =>
      publicUnitIds.has(annotation.textUnitId),
    ),
    entityMentions: snapshot.entityMentions.filter((mention) =>
      publicUnitIds.has(mention.textUnitId),
    ),
  };
}
