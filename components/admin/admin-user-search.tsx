'use client';

import { useDeferredValue, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import type { AdminUserSearchResult } from '@/src/domain/notifications/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type AdminUserSearchProps = {
  locale: AppLocale;
};

const SEARCH_LIMIT = 12;

export function AdminUserSearch({ locale }: AdminUserSearchProps) {
  const t = useTranslations('AdminPage');
  const searchErrorMessage = t('users.search.error');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [users, setUsers] = useState<AdminUserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();

    if (normalizedQuery.length < 2) {
      setUsers([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();

    async function searchUsers() {
      setIsSearching(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          query: normalizedQuery,
          limit: String(SEARCH_LIMIT),
        });
        const response = await fetch(
          `/api/admin/users/search?${searchParams.toString()}`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          const problem = await readProblemDetail(response, searchErrorMessage);
          setError(problem.message);
          setUsers([]);
          return;
        }

        const payload = (await response.json()) as {
          users?: AdminUserSearchResult[];
        };
        setUsers(payload.users ?? []);
      } catch (searchError) {
        if (
          searchError instanceof DOMException &&
          searchError.name === 'AbortError'
        ) {
          return;
        }

        setError(searchErrorMessage);
        setUsers([]);
      } finally {
        if (!abortController.signal.aborted) {
          setIsSearching(false);
        }
      }
    }

    void searchUsers();

    return () => {
      abortController.abort();
    };
  }, [deferredQuery, searchErrorMessage]);

  const normalizedQuery = deferredQuery.trim();
  const isTooShort = query.trim().length > 0 && query.trim().length < 2;

  return (
    <div className="space-y-4">
      <Input
        id="admin-user-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('users.search.placeholder')}
        aria-label={t('users.search.label')}
      />

      {isSearching ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {t('users.search.loading')}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {!normalizedQuery ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {t('users.search.idle')}
        </div>
      ) : null}

      {isTooShort ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {t('users.search.short')}
        </div>
      ) : null}

      {normalizedQuery.length >= 2 &&
      !isSearching &&
      !error &&
      users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {t('users.search.empty')}
        </div>
      ) : null}

      {users.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            {t('users.search.resultLimit', { count: SEARCH_LIMIT })}
          </p>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.columns.user')}</TableHead>
                  <TableHead>{t('users.columns.role')}</TableHead>
                  <TableHead>{t('users.columns.status')}</TableHead>
                  <TableHead>{t('users.columns.lastSeen')}</TableHead>
                  <TableHead>{t('users.columns.notifications')}</TableHead>
                  <TableHead className="text-right">
                    {t('users.columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                          {user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === 'ADMIN' || user.role === 'SUPERADMIN'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === 'active' ? 'secondary' : 'outline'
                        }
                      >
                        {t(`users.status.${user.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(
                        user.lastActivityAt,
                        locale,
                        t('users.lastActivityFallback'),
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>
                          {t('users.notifications.total', {
                            count: user.totalNotifications,
                          })}
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-300">
                          {t('users.notifications.unread', {
                            count: user.unreadNotifications,
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                          })}
                        >
                          {t('users.actions.inspect')}
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDateTime(
  value: string | null,
  locale: string,
  fallback: string,
) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
