'use client';

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import type { AppRole } from '@/lib/authorization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AdminUserSearchResult } from '@/src/domain/notifications/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type NotificationAudience = 'user' | 'role' | 'all';

type UserOption = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
};

type AdminNotificationComposerProps = {
  userOptions?: UserOption[];
  allowedAudiences?: readonly NotificationAudience[];
  initialAudience?: NotificationAudience;
  initialTargetUserId?: string;
  initialTargetRole?: AppRole;
  className?: string;
};

const selectClassName = [
  'flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
  'dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:ring-zinc-50',
].join(' ');

export function AdminNotificationComposer({
  userOptions = [],
  allowedAudiences = ['user', 'role', 'all'],
  initialAudience = 'user',
  initialTargetUserId,
  initialTargetRole = 'USER',
  className,
}: AdminNotificationComposerProps) {
  const t = useTranslations('AdminPage');
  const defaultAudience = allowedAudiences.includes(initialAudience)
    ? initialAudience
    : (allowedAudiences[0] ?? 'user');
  const [audience, setAudience] =
    useState<NotificationAudience>(defaultAudience);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: string }>({});
  const [recipientQuery, setRecipientQuery] = useState('');
  const deferredRecipientQuery = useDeferredValue(recipientQuery);
  const [recipientResults, setRecipientResults] = useState<
    AdminUserSearchResult[]
  >([]);
  const [recipientSearchPending, setRecipientSearchPending] = useState(false);
  const [recipientSearchError, setRecipientSearchError] = useState<
    string | null
  >(null);
  const [selectedRecipient, setSelectedRecipient] = useState<UserOption | null>(
    null,
  );
  const recipientSearchErrorMessage = t(
    'users.notifications.recipientSearchError',
  );
  const recipientLabel = useMemo(() => {
    return userOptions.find((user) => user.id === initialTargetUserId)
      ?.displayName;
  }, [initialTargetUserId, userOptions]);
  const requiresRecipientSelection =
    audience === 'user' && !initialTargetUserId && !selectedRecipient;

  useEffect(() => {
    if (audience !== 'user' || initialTargetUserId) {
      setRecipientSearchPending(false);
      setRecipientSearchError(null);
      setRecipientResults([]);
      return;
    }

    const normalizedQuery = deferredRecipientQuery.trim();

    if (normalizedQuery.length < 2) {
      setRecipientSearchPending(false);
      setRecipientSearchError(null);
      setRecipientResults([]);
      return;
    }

    const abortController = new AbortController();

    async function searchRecipients() {
      setRecipientSearchPending(true);
      setRecipientSearchError(null);

      try {
        const searchParams = new URLSearchParams({
          query: normalizedQuery,
          limit: '8',
        });
        const response = await fetch(
          `/api/admin/users/search?${searchParams.toString()}`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          const problem = await readProblemDetail(
            response,
            recipientSearchErrorMessage,
          );
          setRecipientSearchError(problem.message);
          setRecipientResults([]);
          return;
        }

        const payload = (await response.json()) as {
          users?: AdminUserSearchResult[];
        };
        setRecipientResults(payload.users ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setRecipientSearchError(recipientSearchErrorMessage);
        setRecipientResults([]);
      } finally {
        if (!abortController.signal.aborted) {
          setRecipientSearchPending(false);
        }
      }
    }

    void searchRecipients();

    return () => {
      abortController.abort();
    };
  }, [
    audience,
    deferredRecipientQuery,
    initialTargetUserId,
    recipientSearchErrorMessage,
  ]);

  function selectRecipient(user: AdminUserSearchResult) {
    setSelectedRecipient({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    });
    setRecipientQuery('');
    setRecipientResults([]);
    setRecipientSearchError(null);
  }

  function clearRecipientSelection() {
    setSelectedRecipient(null);
    setRecipientQuery('');
    setRecipientResults([]);
    setRecipientSearchError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setState({});

    const formData = new FormData(form);
    formData.set('audience', audience);
    if (audience === 'user' && selectedRecipient) {
      formData.set('targetUserId', selectedRecipient.id);
    }

    const response = await fetch('/api/admin/notifications', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        t('users.notifications.genericError'),
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const body = (await response.json().catch(() => null)) as {
      recipientCount?: number;
    } | null;

    form.reset();
    if (!initialTargetUserId) {
      setSelectedRecipient(null);
      setRecipientQuery('');
      setRecipientResults([]);
    }

    setState({
      success: t('users.notifications.success', {
        count: body?.recipientCount ?? 0,
      }),
    });
    setPending(false);
  }

  const showAudienceSelector = allowedAudiences.length > 1;
  const showUserSelector = audience === 'user' && !initialTargetUserId;
  const showRoleSelector = audience === 'role';

  return (
    <form
      onSubmit={handleSubmit}
      className={['space-y-4', className].filter(Boolean).join(' ')}
    >
      {showAudienceSelector ? (
        <div className="space-y-2">
          <Label htmlFor="admin-notification-audience">
            {t('users.notifications.fields.audience')}
          </Label>
          <select
            id="admin-notification-audience"
            value={audience}
            onChange={(event) =>
              setAudience(event.target.value as NotificationAudience)
            }
            className={selectClassName}
          >
            {allowedAudiences.map((value) => (
              <option key={value} value={value}>
                {t(`users.notifications.audiences.${value}`)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showUserSelector ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="admin-notification-user-search">
              {t('users.notifications.fields.user')}
            </Label>
            <Input
              id="admin-notification-user-search"
              type="search"
              value={recipientQuery}
              onChange={(event) => {
                setRecipientQuery(event.target.value);
                setSelectedRecipient(null);
              }}
              placeholder={t('users.notifications.recipientSearchPlaceholder')}
              autoComplete="off"
            />
          </div>

          {selectedRecipient ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/70">
              <input
                type="hidden"
                name="targetUserId"
                value={selectedRecipient.id}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {t('users.notifications.selectedRecipient')}
                  </p>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                    {selectedRecipient.displayName} | {selectedRecipient.email}{' '}
                    | {selectedRecipient.role}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearRecipientSelection}
                >
                  {t('users.notifications.changeRecipient')}
                </Button>
              </div>
            </div>
          ) : null}

          {!selectedRecipient && recipientSearchPending ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('users.notifications.recipientSearchLoading')}
            </p>
          ) : null}
          {!selectedRecipient && recipientSearchError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {recipientSearchError}
            </p>
          ) : null}

          {!selectedRecipient &&
          deferredRecipientQuery.trim().length >= 2 &&
          !recipientSearchPending &&
          !recipientSearchError &&
          recipientResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {t('users.notifications.recipientSearchEmpty')}
            </div>
          ) : null}

          {!selectedRecipient && recipientResults.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
              {recipientResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectRecipient(user)}
                  className="flex w-full items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-zinc-950 dark:text-zinc-50">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-zinc-600 dark:text-zinc-300">
                      {user.email}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                    {user.role}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {initialTargetUserId ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          <input
            type="hidden"
            name="targetUserId"
            value={initialTargetUserId}
          />
          <p className="font-medium text-zinc-950 dark:text-zinc-50">
            {t('users.notifications.directRecipient')}
          </p>
          <p className="mt-1">{recipientLabel ?? t('users.detail.fallback')}</p>
        </div>
      ) : null}

      {showRoleSelector ? (
        <div className="space-y-2">
          <Label htmlFor="admin-notification-role">
            {t('users.notifications.fields.role')}
          </Label>
          <select
            id="admin-notification-role"
            name="targetRole"
            defaultValue={initialTargetRole}
            className={selectClassName}
            required
          >
            {(['SUPERADMIN', 'ADMIN', 'MANAGER', 'USER'] as const).map(
              (role) => (
                <option key={role} value={role}>
                  {t(`users.notifications.roles.${role}`)}
                </option>
              ),
            )}
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="admin-notification-title">
          {t('users.notifications.fields.title')}
        </Label>
        <Input
          id="admin-notification-title"
          name="title"
          minLength={3}
          maxLength={120}
          placeholder={t('users.notifications.placeholders.title')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-notification-body">
          {t('users.notifications.fields.body')}
        </Label>
        <Textarea
          id="admin-notification-body"
          name="body"
          minLength={5}
          maxLength={500}
          placeholder={t('users.notifications.placeholders.body')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-notification-href">
          {t('users.notifications.fields.href')}
        </Label>
        <Input
          id="admin-notification-href"
          name="href"
          placeholder={t('users.notifications.placeholders.href')}
          pattern="\/.*"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('users.notifications.hrefHint')}
        </p>
      </div>

      <Button type="submit" disabled={pending || requiresRecipientSelection}>
        {pending
          ? t('users.notifications.sending')
          : t('users.notifications.submit')}
      </Button>

      <div role="status" className="space-y-1">
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {state.success}
          </p>
        ) : null}
      </div>
    </form>
  );
}
