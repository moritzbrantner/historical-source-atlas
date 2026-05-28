import { getAtlasSourceFromDb } from '@/src/atlas/server/atlasSourceRepository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const source = await getAtlasSourceFromDb(slug);

  if (!source) {
    return Response.json({ error: 'Source not found' }, { status: 404 });
  }

  return Response.json(source);
}
