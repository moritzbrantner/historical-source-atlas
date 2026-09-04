import { adaptAtlasV1SnapshotStrictlyToV2 } from '../migration/strictV1ToV2Adapter';
import { readAtlasV1MigrationSnapshotFromDb } from './atlasV1MigrationSnapshot';

export async function readAtlasV2MigrationModelFromDb() {
  const snapshot = await readAtlasV1MigrationSnapshotFromDb();
  return adaptAtlasV1SnapshotStrictlyToV2(snapshot);
}
