import { projectSourceDetail } from '../domain/v2/projections';
import { documentaryRef } from '../domain/v2/reference';
import { readAtlasV2MigrationModelFromDb } from './atlasV2MigrationRepository';

export async function getAtlasV2SourceDetailProjectionFromDb(slug: string) {
  const sourceId = slug.trim();
  if (!sourceId) {
    return null;
  }

  const migration = await readAtlasV2MigrationModelFromDb();
  return projectSourceDetail(
    migration.model,
    documentaryRef('source', sourceId),
  );
}
