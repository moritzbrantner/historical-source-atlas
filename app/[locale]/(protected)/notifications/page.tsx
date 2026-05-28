import { NotificationsFeedCard } from '@/components/notifications/notifications-feed-card';
import { buttonVariants } from '@/components/ui/button';
import { LocalizedLink } from '@/i18n/server-link';

import { getNotificationsPageDataUseCase } from '@/src/domain/notifications/use-cases';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabledForUser,
  requireAuth,
  resolveLocale,
} from '@/src/server/page-guards';

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const requestedSearchParams = await searchParams;
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  await notFoundUnlessFeatureEnabledForUser('notifications', session.user);
  const t = createTranslator(locale, 'NotificationsPage');
  const data = await getNotificationsPageDataUseCase(session.user.id, {
    page: parsePageParam(requestedSearchParams?.page),
    pageSize: 20,
  });

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="flex justify-end">
        <LocalizedLink
          href="/settings/notifications"
          locale={locale}
          className={buttonVariants({ variant: 'outline' })}
        >
          {t('settingsButton')}
        </LocalizedLink>
      </div>

      <NotificationsFeedCard
        items={data.items}
        unreadCount={data.unreadCount}
        totalCount={data.totalCount}
        page={data.page}
        pageSize={data.pageSize}
        totalPages={data.totalPages}
        hasPreviousPage={data.hasPreviousPage}
        hasNextPage={data.hasNextPage}
        previousHref={buildPageHref(data.page - 1)}
        nextHref={buildPageHref(data.page + 1)}
      />
    </section>
  );
}

function parsePageParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsedValue = Number.parseInt(rawValue ?? '', 10);

  return Number.isFinite(parsedValue) ? parsedValue : 1;
}

function buildPageHref(page: number) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set('page', String(page));
  }

  const query = searchParams.toString();
  return query ? `/notifications?${query}` : '/notifications';
}
