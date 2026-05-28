import { loadSettingsPageData } from './load-settings-page';
import { SettingsClient } from './settings-client';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const pageData = await loadSettingsPageData(rawLocale);

  return <SettingsClient {...pageData} section="appearance" />;
}
