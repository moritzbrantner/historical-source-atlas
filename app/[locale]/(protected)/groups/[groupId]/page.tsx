import { notFound } from 'next/navigation';

import { Link } from '@/i18n/navigation';
import { GroupDetailClient } from '@/components/groups/group-detail-client';
import { getGroupDetailUseCase } from '@/src/domain/groups/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabledForUser,
  requireAuth,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; groupId: string }>;
}) {
  const { locale: rawLocale, groupId } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  await notFoundUnlessFeatureEnabledForUser('groups', session.user);
  const t = createTranslator(locale, 'GroupsPage');
  const result = await getGroupDetailUseCase(
    session.user.id,
    session.user.role,
    groupId,
  );

  if (!result.ok) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-3">
        <Link
          href="/groups"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          {t('detail.back')}
        </Link>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {result.data.name}
          </h1>
          {result.data.description ? (
            <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
              {result.data.description}
            </p>
          ) : null}
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('detail.meta', {
              members: result.data.memberCount,
              invitations: result.data.pendingInvitationCount,
            })}
          </p>
        </div>
      </header>

      <GroupDetailClient
        group={result.data}
        currentUserId={session.user.id}
        locale={locale}
      />
    </section>
  );
}
