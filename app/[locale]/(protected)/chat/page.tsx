import { notFound } from 'next/navigation';

import { ProfileChatShell } from '@/components/profile-chat-shell';
import { listFriendProfilesUseCase } from '@/src/domain/profile/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabledForUser,
  requireAuth,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  await notFoundUnlessFeatureEnabledForUser('people.directory', session.user);
  const t = createTranslator(locale, 'ProfileChatPage');
  const friendsResult = await listFriendProfilesUseCase(session.user.id);

  if (!friendsResult.ok) {
    notFound();
  }

  return (
    <ProfileChatShell
      locale={locale}
      profiles={friendsResult.data.profiles}
      selectedMemberId={null}
      title={t('title')}
      description={t('description')}
      empty={t('empty')}
    >
      <div className="flex min-h-[24rem] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
        <div className="max-w-sm space-y-2">
          <h2 className="text-lg font-semibold">{t('selectChatTitle')}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('selectChatDescription')}
          </p>
        </div>
      </div>
    </ProfileChatShell>
  );
}
