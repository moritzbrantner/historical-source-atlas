import { getAtlasEntityRelationsBySlug } from '@/src/atlas/server/atlasEntityRepository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const relations = await getAtlasEntityRelationsBySlug(slug);

  if (!relations) {
    return Response.json({ error: 'Entity not found' }, { status: 404 });
  }

  return Response.json(relations);
}
