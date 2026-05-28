'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import {
  dispatchNotificationMarkedRead,
  NOTIFICATION_MARK_ALL_READ_EVENT,
  NOTIFICATION_MARK_READ_EVENT,
} from '@/components/notifications/events';
import { MarkNotificationReadButton } from '@/components/notifications/mark-notification-read-button';
import { postNotificationRead } from '@/components/notifications/read-action';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import type { NotificationFeedItem } from '@/src/domain/notifications/use-cases';
import { useTranslations } from '@/src/i18n';

type NotificationBellProps = {
  items: NotificationFeedItem[];
  unreadCount: number;
};

type NotificationBellState = {
  items: NotificationFeedItem[];
  unreadCount: number;
};

function markNotificationRead(
  state: NotificationBellState,
  notificationId: string,
): NotificationBellState {
  const target = state.items.find((item) => item.id === notificationId);

  if (!target || target.status === 'read') {
    return state;
  }

  return {
    items: state.items.map((item) =>
      item.id === notificationId ? { ...item, status: 'read' } : item,
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  };
}

export function NotificationBell({
  items,
  unreadCount,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const navigationT = useTranslations('NavigationBar');
  const [state, setState] = useState<NotificationBellState>({
    items,
    unreadCount,
  });
  const visibleItems = useMemo(() => {
    const seenTitles = new Set<string>();

    return state.items.filter((item) => {
      if (seenTitles.has(item.title)) {
        return false;
      }

      seenTitles.add(item.title);
      return true;
    });
  }, [state.items]);

  useEffect(() => {
    setState({ items, unreadCount });
  }, [items, unreadCount]);

  useEffect(() => {
    function handleMarkRead(event: Event) {
      const detail = (event as CustomEvent<{ notificationId?: string }>).detail;
      const notificationId = detail?.notificationId;

      if (!notificationId) {
        return;
      }

      setState((currentState) =>
        markNotificationRead(currentState, notificationId),
      );
    }

    function handleMarkAllRead() {
      setState((currentState) => ({
        items: currentState.items.map((item) =>
          item.status === 'unread' ? { ...item, status: 'read' } : item,
        ),
        unreadCount: 0,
      }));
    }

    window.addEventListener(NOTIFICATION_MARK_READ_EVENT, handleMarkRead);
    window.addEventListener(
      NOTIFICATION_MARK_ALL_READ_EVENT,
      handleMarkAllRead,
    );

    return () => {
      window.removeEventListener(NOTIFICATION_MARK_READ_EVENT, handleMarkRead);
      window.removeEventListener(
        NOTIFICATION_MARK_ALL_READ_EVENT,
        handleMarkAllRead,
      );
    };
  }, []);

  async function handleNotificationLinkClick(
    event: MouseEvent<HTMLAnchorElement>,
    item: NotificationFeedItem,
  ) {
    setOpen(false);

    if (item.status === 'read' || shouldUseNativeNavigation(event)) {
      return;
    }

    event.preventDefault();

    try {
      const response = await postNotificationRead(item.id);

      if (response.ok) {
        setState((currentState) => markNotificationRead(currentState, item.id));
        dispatchNotificationMarkedRead(item.id);
      }
    } finally {
      if (item.href) {
        router.push(item.href);
      }
    }
  }

  return (
    <div
      className="relative"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        aria-label={navigationT('notifications.button', {
          count: state.unreadCount,
        })}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {state.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-5 text-white">
            {state.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {navigationT('notifications.title')}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {navigationT('notifications.subtitle', {
                  count: state.unreadCount,
                })}
              </p>
            </div>
            {state.unreadCount > 0 ? <Badge>{state.unreadCount}</Badge> : null}
          </div>

          <div className="mt-3 space-y-2">
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {item.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatNotificationDate(item.createdAt)}
                        </p>
                      </div>
                      {item.status === 'unread' ? (
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      {item.body}
                    </p>
                  </>
                );

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={(event) => {
                          void handleNotificationLinkClick(event, item);
                        }}
                        className="block transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}

                    {item.status === 'unread' ? (
                      <MarkNotificationReadButton
                        notificationId={item.id}
                        label={navigationT('notifications.markRead')}
                        pendingLabel={navigationT('notifications.markingRead')}
                        errorLabel={navigationT('notifications.markReadError')}
                        onSuccess={() => {
                          setState((currentState) =>
                            markNotificationRead(currentState, item.id),
                          );
                        }}
                        className="mt-3 px-0 text-xs"
                        errorClassName="text-xs text-red-600 dark:text-red-400"
                      />
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {navigationT('notifications.empty')}
              </div>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'mt-3 w-full justify-center',
            })}
          >
            {navigationT('notifications.viewAll')}
          </Link>
        </div>
      ) : null}
    </div>
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

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
    >
      <path d="M15 18H9" />
      <path d="M18 16V11C18 7.686 15.314 5 12 5C8.686 5 6 7.686 6 11V16L4 18H20L18 16Z" />
    </svg>
  );
}
