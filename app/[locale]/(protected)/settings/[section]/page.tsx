import { notFound } from 'next/navigation';

import {
  settingsSectionSet,
  type SettingsSection,
} from '@/src/settings/sections';

import { loadSettingsPageData } from '../load-settings-page';
import { SettingsClient } from '../settings-client';

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}) {
  const { locale: rawLocale, section } = await params;

  if (!settingsSectionSet.has(section) || section === 'appearance') {
    notFound();
  }

  const pageData = await loadSettingsPageData(rawLocale);

  return <SettingsClient {...pageData} section={section as SettingsSection} />;
}
