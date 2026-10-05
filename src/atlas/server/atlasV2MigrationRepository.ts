import { selectPublicAtlasV1Snapshot } from '../migration/publicV1Snapshot';
import { adaptAtlasV1SnapshotStrictlyToV2 } from '../migration/strictV1ToV2Adapter';
import { readAtlasV1MigrationSnapshotFromDb } from './atlasV1MigrationSnapshot';

export async function readAtlasV2MigrationModelFromDb() {
  const snapshot = await readAtlasV1MigrationSnapshotFromDb();
  return adaptAtlasV1SnapshotStrictlyToV2(snapshot);
}

export async function readPublicAtlasV2MigrationModelFromDb() {
  const snapshot = await readAtlasV1MigrationSnapshotFromDb();
  return adaptAtlasV1SnapshotStrictlyToV2(
    selectPublicAtlasV1Snapshot(snapshot),
  );
}
