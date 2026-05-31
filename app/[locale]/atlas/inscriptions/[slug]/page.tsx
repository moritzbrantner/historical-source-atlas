import { EntityRoute } from '@/src/atlas/app/EntityRoute';
import { generateStaticEntityParams } from '@/src/atlas/app/staticEntityParams';
import { resolveLocale } from '@/src/server/page-guards';

export const dynamicParams = false;

export function generateStaticParams() {
  return generateStaticEntityParams('inscriptions');
}

export default async function LocalizedAtlasInscriptionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  resolveLocale(rawLocale);

  return <EntityRoute slug={slug} />;
}
