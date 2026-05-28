import type { AppLocale } from '@moritzbrantner/app-pack';
import { Card, CardContent, CardHeader } from '@moritzbrantner/ui';

import { createTranslator } from '@/src/i18n/messages';

export default async function AboutPage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'AboutPage');

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('description')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
        <p>{t('paragraphOne')}</p>
        <p>{t('paragraphTwo')}</p>
      </CardContent>
    </Card>
  );
}
