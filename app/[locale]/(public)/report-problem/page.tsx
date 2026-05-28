import { ReportProblemForm } from '@/components/report-problem-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabled,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function ReportProblemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('reportProblem');
  const t = createTranslator(locale, 'ReportProblemPage');

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
          {t('eyebrow')}
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
            {t('description')}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('checklistTitle')}</CardTitle>
            <CardDescription>{t('checklistDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChecklistItem
              title={t('checklist.summary.title')}
              description={t('checklist.summary.description')}
            />
            <ChecklistItem
              title={t('checklist.context.title')}
              description={t('checklist.context.description')}
            />
            <ChecklistItem
              title={t('checklist.contact.title')}
              description={t('checklist.contact.description')}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('responseTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <p>{t('responseBody')}</p>
              <p>{t('privacyNote')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('footnote')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportProblemForm />
        </CardContent>
      </Card>
    </section>
  );
}

function ChecklistItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border p-4 dark:border-zinc-800">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {description}
      </p>
    </div>
  );
}
