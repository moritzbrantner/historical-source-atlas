import Image from 'next/image';
import { notFound } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocalizedLink } from '@/i18n/server-link';
import { getAuthSession } from '@/src/auth.server';
import { listProfileFollowingByTagUseCase } from '@/src/domain/profile/use-cases';
import { isSiteFeatureEnabled } from '@/src/foundation/features/access';
import { createTranslator } from '@/src/i18n/messages';
import {
  buildPublicProfilePath,
  formatProfileTag,
  parseProfileTagSegment,
} from '@/src/profile/tags';
import {
  notFoundUnlessFeatureEnabled,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function PublicProfileFollowingPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: rawLocale, userId: rawTagSegment } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('profiles.public');

  if (!(await isSiteFeatureEnabled('profiles.follow'))) {
    notFound();
  }

  const profileTag = parseProfileTagSegment(rawTagSegment);

  if (!profileTag) {
    notFound();
  }

  const t = createTranslator(locale, 'ProfilePage');
  const session = await getAuthSession();
  const viewerUserId = session?.user.id ?? null;
  const result = await listProfileFollowingByTagUseCase(
    profileTag,
    viewerUserId,
  );

  if (!result.ok) {
    notFound();
  }

  const { profile, following, totalFollowingCount } = result.data;

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t('followingPage.title')}</CardTitle>
            <CardDescription>
              {t('followingPage.description', {
                name: profile.displayName,
                count: totalFollowingCount,
              })}
            </CardDescription>
          </div>

          <LocalizedLink
            href={buildPublicProfilePath(profile.tag)}
            locale={locale}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {t('followingPage.backToProfile')}
          </LocalizedLink>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('followingPage.summary', {
              visibleCount: following.length,
              totalCount: totalFollowingCount,
            })}
          </p>
        </CardContent>
      </Card>

      {totalFollowingCount === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('followingPage.empty')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {following.map((followedProfile) => (
            <LocalizedLink
              key={followedProfile.userId}
              href={buildPublicProfilePath(followedProfile.tag)}
              locale={locale}
              className="group block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50"
            >
              <Card className="transition-colors group-hover:border-zinc-300 group-hover:bg-zinc-50 dark:group-hover:border-zinc-700 dark:group-hover:bg-zinc-900">
                <CardContent className="flex items-center gap-3 pt-6">
                  <Avatar
                    imageUrl={followedProfile.imageUrl}
                    displayName={followedProfile.displayName}
                  />

                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {followedProfile.displayName}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {formatProfileTag(followedProfile.tag)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </LocalizedLink>
          ))}
        </div>
      )}
    </section>
  );
}

function Avatar({
  imageUrl,
  displayName,
}: {
  imageUrl: string | null;
  displayName: string;
}) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="48px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </div>
  );
}
