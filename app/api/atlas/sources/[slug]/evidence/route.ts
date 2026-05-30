import { getAtlasEvidenceReviewFromDb } from '@/src/atlas/server/atlasEvidenceRepository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const evidence = await getAtlasEvidenceReviewFromDb(slug);

  if (!evidence) {
    return Response.json({ error: 'Source not found' }, { status: 404 });
  }

  return Response.json(evidence);
}
