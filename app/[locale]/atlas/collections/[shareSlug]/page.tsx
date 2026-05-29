import { CollectionRoute } from '@/src/atlas/app/CollectionRoute';
import { resolveLocale } from '@/src/server/page-guards';

export function generateStaticParams() {
  return [];
}

export default async function LocalizedAtlasCollectionPage({
  params,
}: {
  params: Promise<{ locale: string; shareSlug: string }>;
}) {
  const { locale: rawLocale, shareSlug } = await params;
  resolveLocale(rawLocale);

  return <CollectionRoute shareSlug={shareSlug} />;
}
