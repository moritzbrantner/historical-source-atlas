import { listAtlasSourcesFromDb } from '@/src/atlas/server/atlasSourceRepository';

export async function GET() {
  const sources = await listAtlasSourcesFromDb();

  return Response.json(sources);
}
