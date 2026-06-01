import { redirect } from 'next/navigation';

import { StaticRedirectPage } from '@/components/static-redirect-page';
import { routing, withLocalePath } from '@/i18n/routing';
import { historicalSources } from '@/src/atlas/entities/source/api/staticSourceData';
import { isGithubPagesBuild } from '@/src/runtime/build-target';

export function generateStaticParams() {
  return historicalSources.map((source) => ({ slug: source.id }));
}

export default async function SourceReferenceNetworkRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const localizedPath = withLocalePath(
    `/atlas/sources/${encodeURIComponent(slug)}/reference-network`,
    routing.defaultLocale,
  );

  if (isGithubPagesBuild) {
    return (
      <StaticRedirectPage
        href={`../../../${routing.defaultLocale}/atlas/sources/${encodeURIComponent(
          slug,
        )}/reference-network/`}
      />
    );
  }

  redirect(localizedPath);
}
