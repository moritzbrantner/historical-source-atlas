import { AtlasProviders } from '@/src/atlas/app/AtlasProviders';
import { SourceRoute } from '@/src/atlas/app/SourceRoute';

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <AtlasProviders>
      <SourceRoute sourceId={slug} />
    </AtlasProviders>
  );
}
