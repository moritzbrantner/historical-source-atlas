'use client';

import { startTransition, useOptimistic, type MouseEvent } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dispatchNotificationMarkedRead } from '@/components/notifications/events';
import { MarkAllReadButton } from '@/components/notifications/mark-all-read-button';
import { MarkNotificationReadButton } from '@/components/notifications/mark-notification-read-button';
import { postNotificationRead } from '@/components/notifications/read-action';
import type { NotificationFeedItem } from '@/src/domain/notifications/use-cases';
import { useTranslations } from '@/src/i18n';

const badgeVariants = { unread: 'default', read: 'secondary' } as const;

type NotificationFeedState = {
  items: NotificationFeedItem[];
  unreadCount: number;
};

type NotificationFeedAction =
  | { type: 'mark-read'; notificationId: string }
  | { type: 'mark-all-read' };

type NotificationsFeedCardProps = {
  items: NotificationFeedItem[];
  unreadCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  previousHref: string;
  nextHref: string;
};

export function NotificationsFeedCard({
  items: initialItems,
  unreadCount: initialUnreadCount,
  totalCount,
  page,
  pageSize,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  previousHref,
  nextHref,
}: NotificationsFeedCardProps) {
  const t = useTranslations('NotificationsPage');
  const router = useRouter();
  const [state, applyOptimisticUpdate] = useOptimistic<
    NotificationFeedState,
    NotificationFeedAction
  >(
    { items: initialItems, unreadCount: initialUnreadCount },
    (currentState, action) => {
      switch (action.type) {
        case 'mark-read': {
          const target = currentState.items.find(
            (item) => item.id === action.notificationId,
          );

          if (!target || target.status === 'read') {
            return currentState;
          }

          return {
            items: currentState.items.map((item) =>
              item.id === action.notificationId
                ? { ...item, status: 'read' }
                : item,
            ),
            unreadCount: Math.max(0, currentState.unreadCount - 1),
          };
        }
        case 'mark-all-read':
          return {
            items: currentState.items.map((item) =>
              item.status === 'unread' ? { ...item, status: 'read' } : item,
            ),
            unreadCount: 0,
          };
        default:
          return currentState;
      }
    },
  );

  async function handleNotificationLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    item: NotificationFeedItem,
  ) {
    if (item.status === 'read' || shouldUseNativeNavigation(event)) {
      return;
    }

    event.preventDefault();

    try {
      const response = await postNotificationRead(item.id);

      if (response.ok) {
        startTransition(() => {
          applyOptimisticUpdate({
            type: 'mark-read',
            notificationId: item.id,
          });
        });
        dispatchNotificationMarkedRead(item.id);
      }
    } finally {
      if (item.href) {
        router.push(item.href);
      }
    }
  }

  return (
    <Card className="rounded-[1.75rem]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{t('feed.title')}</CardTitle>
          </div>
          <MarkAllReadButton
            disabled={state.unreadCount === 0}
            onSuccess={() => {
              startTransition(() => {
                applyOptimisticUpdate({ type: 'mark-all-read' });
              });
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.items.length > 0 ? (
          state.items.map((item) => {
            const status = item.status as keyof typeof badgeVariants;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={(event) => {
                        void handleNotificationLinkClick(event, item);
                      }}
                      className="min-w-0 flex-1"
                    >
                      <NotificationContent
                        item={item}
                        badgeVariant={badgeVariants[status]}
                        statusLabel={t(`feed.status.${item.status}`)}
                      />
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <NotificationContent
                        item={item}
                        badgeVariant={badgeVariants[status]}
                        statusLabel={t(`feed.status.${item.status}`)}
                      />
                    </div>
                  )}

                  {item.status === 'unread' ? (
                    <MarkNotificationReadButton
                      notificationId={item.id}
                      label={t('feed.markRead')}
                      pendingLabel={t('feed.markingRead')}
                      errorLabel={t('feed.markReadError')}
                      onSuccess={() => {
                        startTransition(() => {
                          applyOptimisticUpdate({
                            type: 'mark-read',
                            notificationId: item.id,
                          });
                        });
                      }}
                      className="shrink-0"
                    />
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {t('feed.empty')}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t('feed.pagination.summary', {
              start: totalCount === 0 ? 0 : (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, totalCount),
              total: totalCount,
              page,
              totalPages,
            })}
          </p>
          <div className="flex items-center gap-2">
            {hasPreviousPage ? (
              <Link
                href={previousHref}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('feed.pagination.previous')}
              </Link>
            ) : (
              <span
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'pointer-events-none opacity-50',
                })}
              >
                {t('feed.pagination.previous')}
              </span>
            )}
            {hasNextPage ? (
              <Link
                href={nextHref}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('feed.pagination.next')}
              </Link>
            ) : (
              <span
                className={buttonVariants({
                  variant: 'outline',
                  size: 'sm',
                  className: 'pointer-events-none opacity-50',
                })}
              >
                {t('feed.pagination.next')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function shouldUseNativeNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    (event.currentTarget.target !== '' &&
      event.currentTarget.target !== '_self')
  );
}

function NotificationContent({
  item,
  badgeVariant,
  statusLabel,
}: {
  item: NotificationFeedItem;
  badgeVariant: (typeof badgeVariants)[keyof typeof badgeVariants];
  statusLabel: string;
}) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant}>{statusLabel}</Badge>
          <span className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            {formatNotificationDate(item.createdAt)}
          </span>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {item.title}
        </h2>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {item.body}
      </p>
    </>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
