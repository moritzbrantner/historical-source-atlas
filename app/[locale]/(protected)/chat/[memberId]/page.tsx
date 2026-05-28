import { notFound } from 'next/navigation';

import { ProfileChatPanel } from '@/components/profile-chat-panel';
import { ProfileChatShell } from '@/components/profile-chat-shell';
import {
  getProfileChatUseCase,
  listFriendProfilesUseCase,
} from '@/src/domain/profile/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabledForUser,
  requireAuth,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function ProfileChatPage({
  params,
}: {
  params: Promise<{ locale: string; memberId: string }>;
}) {
  const { locale: rawLocale, memberId: rawMemberId } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  await notFoundUnlessFeatureEnabledForUser('people.directory', session.user);
  const memberId = decodeMemberId(rawMemberId);

  if (!memberId) {
    notFound();
  }

  const [chatResult, friendsResult] = await Promise.all([
    getProfileChatUseCase(session.user.id, memberId),
    listFriendProfilesUseCase(session.user.id),
  ]);

  if (!chatResult.ok || !friendsResult.ok) {
    notFound();
  }

  const t = createTranslator(locale, 'ProfileChatPage');

  return (
    <ProfileChatShell
      locale={locale}
      profiles={friendsResult.data.profiles}
      selectedMemberId={memberId}
      title={t('title')}
      description={t('description')}
      empty={t('empty')}
    >
      <ProfileChatPanel
        currentUserId={session.user.id}
        member={chatResult.data.member}
        initialMessages={chatResult.data.messages}
      />
    </ProfileChatShell>
  );
}

function decodeMemberId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
