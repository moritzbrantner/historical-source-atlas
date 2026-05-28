import { routing } from '@/i18n/routing';
import { SourceRoute } from '@/src/atlas/app/SourceRoute';
import { historicalSources } from '@/src/atlas/entities/source/api/staticSourceData';
import { resolveLocale } from '@/src/server/page-guards';

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    historicalSources.map((source) => ({ locale, slug: source.id })),
  );
}

export default async function LocalizedAtlasSourcePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  resolveLocale(rawLocale);

  return <SourceRoute sourceId={slug} />;
}
