import type { ReactNode } from 'react';

import { AtlasProviders } from '@/src/atlas/app/AtlasProviders';
import { AtlasWebShell } from '@/src/atlas/app/AtlasWebShell';
import { I18nProvider } from '@/src/i18n';
import { resolveLocale } from '@/src/server/page-guards';

export default async function AtlasLocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);

  return (
    <I18nProvider locale={locale} messages={{}}>
      <AtlasProviders>
        <AtlasWebShell locale={locale}>{children}</AtlasWebShell>
      </AtlasProviders>
    </I18nProvider>
  );
}
