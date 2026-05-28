import { notFound } from 'next/navigation';

import { GroupsClient } from '@/components/groups/groups-client';
import { getGroupsPageDataUseCase } from '@/src/domain/groups/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabledForUser,
  requireAuth,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  await notFoundUnlessFeatureEnabledForUser('groups', session.user);
  const t = createTranslator(locale, 'GroupsPage');
  const result = await getGroupsPageDataUseCase(
    session.user.id,
    session.user.role,
  );

  if (!result.ok) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
          {t('description')}
        </p>
      </header>

      <GroupsClient
        initialGroups={result.data.groups}
        initialInvitations={result.data.invitations}
      />
    </section>
  );
}
