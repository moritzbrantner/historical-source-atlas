import { AtlasProviders } from '@/src/atlas/app/AtlasProviders';
import { SourceRoute } from '@/src/atlas/app/SourceRoute';
import { AtlasWebShell } from '@/src/atlas/app/AtlasWebShell';
import { historicalSources } from '@/src/atlas/entities/source/api/staticSourceData';

export function generateStaticParams() {
  return historicalSources.map((source) => ({ slug: source.id }));
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <AtlasProviders>
      <AtlasWebShell>
        <SourceRoute sourceId={slug} />
      </AtlasWebShell>
    </AtlasProviders>
  );
}
