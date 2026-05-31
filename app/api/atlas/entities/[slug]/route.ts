import { getAtlasEntityDetailFromDb } from '@/src/atlas/server/atlasEntityRepository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const entity = await getAtlasEntityDetailFromDb(slug);

  if (!entity) {
    return Response.json({ error: 'Entity not found' }, { status: 404 });
  }

  return Response.json(entity);
}
