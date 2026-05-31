import type { EntityType } from '@/src/atlas/domain/dataModel';
import { listAtlasEntitiesFromDb } from '@/src/atlas/server/atlasEntityRepository';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  const kind = url.searchParams.get('kind');
  const type = url.searchParams.get('type') as EntityType | null;
  const entities = await listAtlasEntitiesFromDb({ kind, query, type });

  return Response.json(entities);
}
