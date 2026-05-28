import { notFound } from 'next/navigation';

import { FriendsDirectory } from '@/components/friends-directory';

import { listFriendProfilesUseCase } from '@/src/domain/profile/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabledForUser,
  requireAuth,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function FriendsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  await notFoundUnlessFeatureEnabledForUser('people.directory', session.user);
  const t = createTranslator(locale, 'PeoplePage');
  const friendsResult = await listFriendProfilesUseCase(session.user.id);

  if (!friendsResult.ok) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
          {t('description')}
        </p>
      </header>

      <FriendsDirectory initialFriends={friendsResult.data.profiles} />
    </section>
  );
}
