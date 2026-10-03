import type { AtlasV1MigrationSnapshot } from '../server/atlasV1MigrationSnapshot';

/**
 * Restricts a legacy v1 snapshot to publicly visible records before it is
 * adapted for unauthenticated read surfaces. Only entities with
 * `editorial_status = 'published'` (and, for catalog entities, a published
 * record), published catalog records, and public text editions survive; every
 * row owned by or referring to a removed entity, record, edition, or text unit
 * is removed with it.
 */
export function selectPublicAtlasV1Snapshot(
  snapshot: AtlasV1MigrationSnapshot,
): AtlasV1MigrationSnapshot {
  // An entity that carries catalog records is only public through a published
  // record; otherwise relations and links could still disclose a draft source.
  const catalogEntityIds = new Set(
    snapshot.catalogRecords.map((record) => record.entityId),
  );
  const publishedCatalogEntityIds = new Set(
    snapshot.catalogRecords
      .filter((record) => record.published)
      .map((record) => record.entityId),
  );
  const entities = snapshot.entities.filter(
    (entity) =>
      entity.editorialStatus === 'published' &&
      (!catalogEntityIds.has(entity.id) ||
        publishedCatalogEntityIds.has(entity.id)),
  );
  const publicEntityIds = new Set(entities.map((entity) => entity.id));
  const ownedByPublicEntity = <Row extends { entityId: string }>(
    rows: readonly Row[],
  ) => rows.filter((row) => publicEntityIds.has(row.entityId));

  const catalogRecords = ownedByPublicEntity(snapshot.catalogRecords).filter(
    (record) => record.published,
  );
  const publicCatalogRecordIds = new Set(
    catalogRecords.map((record) => record.id),
  );
  const textEditions = ownedByPublicEntity(snapshot.textEditions).filter(
    (edition) => edition.isPublic,
  );
  const publicEditionIds = new Set(textEditions.map((edition) => edition.id));
  const textUnits = snapshot.textUnits.filter((unit) =>
    publicEditionIds.has(unit.textEditionId),
  );
  const publicUnitIds = new Set(textUnits.map((unit) => unit.id));

  return {
    entities,
    catalogRecords,
    catalogRecordLinks: snapshot.catalogRecordLinks.filter(
      (link) =>
        publicCatalogRecordIds.has(link.catalogRecordId) &&
        publicEntityIds.has(link.entityId),
    ),
    places: ownedByPublicEntity(snapshot.places),
    events: ownedByPublicEntity(snapshot.events),
    agents: ownedByPublicEntity(snapshot.agents),
    physicalObjects: ownedByPublicEntity(snapshot.physicalObjects),
    objectParts: ownedByPublicEntity(snapshot.objectParts),
    manuscriptUnits: ownedByPublicEntity(snapshot.manuscriptUnits),
    inscriptions: ownedByPublicEntity(snapshot.inscriptions),
    textWorks: ownedByPublicEntity(snapshot.textWorks),
    textWitnesses: ownedByPublicEntity(snapshot.textWitnesses),
    textEditions,
    textUnits,
    textAnnotations: snapshot.textAnnotations.filter((annotation) =>
      publicUnitIds.has(annotation.textUnitId),
    ),
    entityMentions: ownedByPublicEntity(snapshot.entityMentions).filter(
      (mention) => publicUnitIds.has(mention.textUnitId),
    ),
    entityRelations: snapshot.entityRelations.filter(
      (relation) =>
        publicEntityIds.has(relation.subjectEntityId) &&
        (relation.objectEntityId === null ||
          publicEntityIds.has(relation.objectEntityId)),
    ),
    assets: ownedByPublicEntity(snapshot.assets),
  };
}
