import { redirect } from 'next/navigation';

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  redirect(`/${rawLocale}/friends`);
}
