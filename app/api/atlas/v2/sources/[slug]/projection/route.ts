import { getAtlasV2SourceDetailProjectionFromDb } from '@/src/atlas/server/atlasV2ProjectionRepository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const projection = await getAtlasV2SourceDetailProjectionFromDb(slug);

  if (!projection) {
    return Response.json(
      { error: 'Source projection not found' },
      { status: 404 },
    );
  }

  return Response.json(projection);
}
