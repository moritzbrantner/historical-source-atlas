'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Globe2, Lock, Mail, Plus, Users } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  GroupInvitationSummary,
  GroupSummary,
} from '@/src/domain/groups/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type GroupsClientProps = {
  initialGroups: GroupSummary[];
  initialInvitations: GroupInvitationSummary[];
};

export function GroupsClient({
  initialGroups,
  initialInvitations,
}: GroupsClientProps) {
  const t = useTranslations('GroupsPage');
  const [groups, setGroups] = useState(initialGroups);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [isCreating, setIsCreating] = useState(false);
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const totalMemberCount = groups.reduce(
    (total, group) => total + group.memberCount,
    0,
  );
  const overviewItems = [
    {
      label: t('overview.groupsLabel'),
      value: groups.length,
    },
    {
      label: t('overview.invitationsLabel'),
      value: invitations.length,
    },
    {
      label: t('overview.membershipsLabel'),
      value: totalMemberCount,
    },
  ];

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
          visibility,
        }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, t('errors.create'));
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as { group?: GroupSummary };

      if (payload.group) {
        setGroups((current) => [payload.group!, ...current]);
        setName('');
        setDescription('');
        setVisibility('PRIVATE');
      }
    } catch {
      setError(t('errors.create'));
    } finally {
      setIsCreating(false);
    }
  }

  async function respondToInvitation(
    invitation: GroupInvitationSummary,
    decision: 'accept' | 'decline',
  ) {
    setPendingInvitationId(invitation.id);
    setError(null);

    try {
      const response = await fetch('/api/groups/invitations/respond', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ invitationId: invitation.id, decision }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(
          response,
          t('errors.invitation'),
        );
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as {
        group?: GroupSummary | null;
      };
      setInvitations((current) =>
        current.filter(
          (currentInvitation) => currentInvitation.id !== invitation.id,
        ),
      );

      if (payload.group) {
        setGroups((current) =>
          current.some((group) => group.id === payload.group!.id)
            ? current
            : [payload.group!, ...current],
        );
      }
    } catch {
      setError(t('errors.invitation'));
    } finally {
      setPendingInvitationId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {overviewItems.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('create.title')}</CardTitle>
              <CardDescription>{t('create.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="create-group"
                className="space-y-4"
                onSubmit={handleCreateGroup}
              >
                <div className="space-y-2">
                  <Label htmlFor="group-name">{t('create.nameLabel')}</Label>
                  <Input
                    id="group-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('create.namePlaceholder')}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-description">
                    {t('create.descriptionLabel')}
                  </Label>
                  <Textarea
                    id="group-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t('create.descriptionPlaceholder')}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group-visibility">
                    {t('create.visibilityLabel')}
                  </Label>
                  <select
                    id="group-visibility"
                    value={visibility}
                    onChange={(event) =>
                      setVisibility(event.target.value as 'PRIVATE' | 'PUBLIC')
                    }
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    <option value="PRIVATE">{t('visibility.PRIVATE')}</option>
                    <option value="PUBLIC">{t('visibility.PUBLIC')}</option>
                  </select>
                </div>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={isCreating || !name.trim()}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {isCreating ? t('create.creating') : t('create.submit')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('invitations.title')}</CardTitle>
              <CardDescription>
                {invitations.length > 0
                  ? t('invitations.description', { count: invitations.length })
                  : t('invitations.empty')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invitations.length > 0 ? (
                invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{invitation.groupName}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {t('invitations.invitedBy', {
                          name: invitation.invitedBy.displayName,
                        })}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={pendingInvitationId === invitation.id}
                        onClick={() =>
                          respondToInvitation(invitation, 'accept')
                        }
                      >
                        {pendingInvitationId === invitation.id
                          ? t('invitations.accepting')
                          : t('invitations.accept')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pendingInvitationId === invitation.id}
                        onClick={() =>
                          respondToInvitation(invitation, 'decline')
                        }
                      >
                        {pendingInvitationId === invitation.id
                          ? t('invitations.declining')
                          : t('invitations.decline')}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                  <Mail className="mb-3 h-5 w-5" aria-hidden="true" />
                  <p>{t('invitations.emptyDescription')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('groups.title')}</CardTitle>
            <CardDescription>
              {groups.length > 0
                ? t('groups.description', { count: groups.length })
                : t('groups.empty')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.length > 0 ? (
              groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="group block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">{group.name}</p>
                      {group.description ? (
                        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                          {group.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        {group.visibility === 'PUBLIC' ? (
                          <Globe2 className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Lock className="h-3 w-3" aria-hidden="true" />
                        )}
                        {t(`visibility.${group.visibility}`)}
                      </Badge>
                      <Badge
                        variant={
                          group.role === 'OWNER'
                            ? 'default'
                            : group.role === 'ADMIN'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {t(`roles.${group.role}`)}
                      </Badge>
                      <ArrowRight
                        className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                    {t('groups.meta', {
                      members: group.memberCount,
                      invitations: group.pendingInvitationCount,
                    })}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                <Users className="mb-3 h-5 w-5" aria-hidden="true" />
                <p>{t('groups.emptyDescription')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
