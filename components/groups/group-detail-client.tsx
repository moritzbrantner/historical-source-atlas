'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useDeferredValue, useEffect, useState } from 'react';

import {
  ChatMessageComposer,
  ChatMessageContent,
  PinMessageButton,
  PinnedMessagesSummary,
  type ChatMessageLabels,
} from '@/components/chat-message-tools';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AppLocale } from '@/i18n/routing';
import type { ChatMessageInput } from '@/src/domain/chat/messages';
import type {
  GroupChatMessage,
  GroupDetail,
  GroupMemberRole,
  GroupMemberSummary,
  GroupPendingInvitation,
  GroupUserSummary,
} from '@/src/domain/groups/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';
import { formatProfileTag } from '@/src/profile/tags';

type GroupDetailClientProps = {
  group: GroupDetail;
  currentUserId: string;
  locale: AppLocale;
};

export function GroupDetailClient({
  group,
  currentUserId,
  locale,
}: GroupDetailClientProps) {
  const t = useTranslations('GroupsPage');
  const searchErrorMessage = t('errors.search');
  const inviteErrorMessage = t('errors.invite');
  const memberErrorMessage = t('errors.member');
  const messageErrorMessage = t('errors.message');
  const [members, setMembers] = useState(group.members);
  const [messages, setMessages] = useState(group.messages);
  const [pendingInvitations, setPendingInvitations] = useState(
    group.pendingInvitations,
  );
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [candidates, setCandidates] = useState<GroupUserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [updatingMessageId, setUpdatingMessageId] = useState<string | null>(
    null,
  );
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();

    if (!group.canInvite || !normalizedQuery) {
      setCandidates([]);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();

    async function searchCandidates() {
      setIsSearching(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          groupId: group.id,
          query: normalizedQuery,
        });
        const response = await fetch(
          `/api/groups/invite-candidates?${params.toString()}`,
          {
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          const problem = await readProblemDetail(response, searchErrorMessage);
          setError(problem.message);
          setCandidates([]);
          return;
        }

        const payload = (await response.json()) as {
          users?: GroupUserSummary[];
        };
        setCandidates(payload.users ?? []);
      } catch (searchError) {
        if (
          searchError instanceof DOMException &&
          searchError.name === 'AbortError'
        ) {
          return;
        }

        setError(searchErrorMessage);
        setCandidates([]);
      } finally {
        setIsSearching(false);
      }
    }

    void searchCandidates();

    return () => {
      abortController.abort();
    };
  }, [deferredQuery, group.canInvite, group.id, searchErrorMessage]);

  async function inviteCandidate(candidate: GroupUserSummary) {
    setPendingUserId(candidate.userId);
    setError(null);

    try {
      const response = await fetch('/api/groups/invitations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ groupId: group.id, userId: candidate.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, inviteErrorMessage);
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as {
        invitation?: GroupPendingInvitation;
      };

      if (payload.invitation) {
        setPendingInvitations((current) =>
          current.some((invitation) => invitation.id === payload.invitation!.id)
            ? current
            : [...current, payload.invitation!],
        );
        setCandidates((current) =>
          current.filter((item) => item.userId !== candidate.userId),
        );
      }
    } catch {
      setError(inviteErrorMessage);
    } finally {
      setPendingUserId(null);
    }
  }

  async function updateRole(
    member: GroupMemberSummary,
    role: Exclude<GroupMemberRole, 'OWNER'>,
  ) {
    setPendingUserId(member.userId);
    setError(null);

    try {
      const response = await fetch('/api/groups/members', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          groupId: group.id,
          userId: member.userId,
          role,
        }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, memberErrorMessage);
        setError(problem.message);
        return;
      }

      setMembers((current) =>
        current.map((currentMember) =>
          currentMember.userId === member.userId
            ? { ...currentMember, role }
            : currentMember,
        ),
      );
    } catch {
      setError(memberErrorMessage);
    } finally {
      setPendingUserId(null);
    }
  }

  async function removeMember(member: GroupMemberSummary) {
    setPendingUserId(member.userId);
    setError(null);

    try {
      const response = await fetch('/api/groups/members', {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ groupId: group.id, userId: member.userId }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, memberErrorMessage);
        setError(problem.message);
        return;
      }

      if (member.userId === currentUserId) {
        window.location.href = `/${locale}/groups`;
        return;
      }

      setMembers((current) =>
        current.filter(
          (currentMember) => currentMember.userId !== member.userId,
        ),
      );
    } catch {
      setError(memberErrorMessage);
    } finally {
      setPendingUserId(null);
    }
  }

  async function sendMessage(input: ChatMessageInput) {
    setIsSendingMessage(true);
    setError(null);
    setMessageFeedback(null);

    try {
      const body = input.attachment
        ? buildGroupMediaMessageFormData(group.id, input)
        : JSON.stringify({
            groupId: group.id,
            message: input.body,
            kind: input.kind,
            options: input.options,
            items: input.items,
          });
      const response = await fetch('/api/groups/messages', {
        method: 'POST',
        headers: input.attachment
          ? undefined
          : {
              'content-type': 'application/json',
            },
        body,
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, messageErrorMessage);
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as {
        message?: GroupChatMessage;
      };

      if (payload.message) {
        setMessages((current) => [...current, payload.message!]);
      }

      setMessageFeedback(t('detail.chatSent'));
    } catch {
      setError(messageErrorMessage);
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function updateMessage(
    messageId: string,
    input: {
      action: 'pin' | 'unpin' | 'vote-poll' | 'toggle-todo';
      optionId?: string;
      itemId?: string;
      completed?: boolean;
    },
  ) {
    setUpdatingMessageId(messageId);
    setError(null);

    try {
      const response = await fetch('/api/groups/messages', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          groupId: group.id,
          messageId,
          ...input,
        }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, messageErrorMessage);
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as {
        message?: GroupChatMessage;
      };

      if (payload.message) {
        setMessages((current) =>
          current.map((message) =>
            message.id === payload.message!.id ? payload.message! : message,
          ),
        );
      }
    } catch {
      setError(messageErrorMessage);
    } finally {
      setUpdatingMessageId(null);
    }
  }

  const chatLabels = getGroupChatLabels(t);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.chatTitle')}</CardTitle>
          <CardDescription>{t('detail.chatDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PinnedMessagesSummary messages={messages} labels={chatLabels} />

          <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {messages.length > 0 ? (
              messages.map((message) => {
                const isOwnMessage = message.sender.userId === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                        isOwnMessage
                          ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                          : 'border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100'
                      }`}
                    >
                      <p
                        className={`mb-1 text-xs font-medium ${
                          isOwnMessage
                            ? 'text-zinc-300 dark:text-zinc-600'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {message.sender.displayName}
                      </p>
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <ChatMessageContent
                            message={message}
                            currentUserId={currentUserId}
                            labels={chatLabels}
                            isOwnMessage={isOwnMessage}
                            disabled={updatingMessageId === message.id}
                            onVote={(messageId, optionId) =>
                              updateMessage(messageId, {
                                action: 'vote-poll',
                                optionId,
                              })
                            }
                            onToggleTodo={(messageId, itemId, completed) =>
                              updateMessage(messageId, {
                                action: 'toggle-todo',
                                itemId,
                                completed,
                              })
                            }
                          />
                        </div>
                        <PinMessageButton
                          pinned={Boolean(message.pinnedAt)}
                          labels={chatLabels}
                          disabled={updatingMessageId === message.id}
                          onClick={() =>
                            updateMessage(message.id, {
                              action: message.pinnedAt ? 'unpin' : 'pin',
                            })
                          }
                        />
                      </div>
                      <p
                        className={`mt-1 text-xs ${
                          isOwnMessage
                            ? 'text-zinc-300 dark:text-zinc-600'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {formatGroupMessageDate(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {t('detail.chatEmpty')}
              </p>
            )}
          </div>

          {messageFeedback ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {messageFeedback}
            </p>
          ) : null}

          {group.canSendMessages ? (
            <ChatMessageComposer
              labels={chatLabels}
              isSending={isSendingMessage}
              onSubmit={sendMessage}
            />
          ) : null}
        </CardContent>
      </Card>

      {group.canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.inviteTitle')}</CardTitle>
            <CardDescription>{t('detail.inviteDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('detail.searchPlaceholder')}
              aria-label={t('detail.searchPlaceholder')}
            />

            {isSearching ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {t('detail.searching')}
              </p>
            ) : null}
            {deferredQuery.trim() && !isSearching && candidates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                {t('detail.noCandidates')}
              </p>
            ) : null}

            <div className="space-y-3">
              {candidates.map((candidate) => (
                <UserRow key={candidate.userId} user={candidate}>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pendingUserId === candidate.userId}
                    onClick={() => inviteCandidate(candidate)}
                  >
                    {pendingUserId === candidate.userId
                      ? t('detail.inviting')
                      : t('detail.invite')}
                  </Button>
                </UserRow>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.membersTitle')}</CardTitle>
            <CardDescription>
              {t('detail.membersDescription', { count: members.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <UserRow key={member.userId} user={member}>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge
                    variant={
                      member.role === 'OWNER'
                        ? 'default'
                        : member.role === 'ADMIN'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {t(`roles.${member.role}`)}
                  </Badge>

                  {group.role === 'OWNER' && member.role !== 'OWNER' ? (
                    <select
                      value={member.role}
                      disabled={pendingUserId === member.userId}
                      onChange={(event) =>
                        updateRole(
                          member,
                          event.target.value as Exclude<
                            GroupMemberRole,
                            'OWNER'
                          >,
                        )
                      }
                      className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      aria-label={t('detail.roleLabel', {
                        name: member.displayName,
                      })}
                    >
                      <option value="MEMBER">{t('roles.MEMBER')}</option>
                      <option value="ADMIN">{t('roles.ADMIN')}</option>
                    </select>
                  ) : null}

                  {member.role !== 'OWNER' &&
                  (group.canManageMembers ||
                    member.userId === currentUserId) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingUserId === member.userId}
                      onClick={() => removeMember(member)}
                    >
                      {member.userId === currentUserId
                        ? t('detail.leave')
                        : t('detail.remove')}
                    </Button>
                  ) : null}
                </div>
              </UserRow>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('detail.pendingTitle')}</CardTitle>
            <CardDescription>
              {pendingInvitations.length > 0
                ? t('detail.pendingDescription', {
                    count: pendingInvitations.length,
                  })
                : t('detail.pendingEmpty')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <UserRow key={invitation.id} user={invitation.invitedUser}>
                <Badge variant="outline">{t('detail.pendingBadge')}</Badge>
              </UserRow>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGroupChatLabels(
  t: ReturnType<typeof useTranslations>,
): ChatMessageLabels {
  return {
    textMode: t('detail.chatComposer.text'),
    pollMode: t('detail.chatComposer.poll'),
    todoMode: t('detail.chatComposer.todo'),
    attachMedia: t('detail.chatComposer.attachMedia'),
    attachmentSelected: t('detail.chatComposer.attachmentSelected'),
    removeAttachment: t('detail.chatComposer.removeAttachment'),
    openAttachment: t('detail.chatComposer.openAttachment'),
    messagePlaceholder: t('detail.chatPlaceholder'),
    pollPlaceholder: t('detail.chatComposer.pollPlaceholder'),
    todoPlaceholder: t('detail.chatComposer.todoPlaceholder'),
    send: t('detail.chatSend'),
    sending: t('detail.chatSending'),
    pinned: t('detail.chatPinned'),
    pin: t('detail.chatPin'),
    unpin: t('detail.chatUnpin'),
    voteFor: t('detail.chatVoteFor'),
    votes: t('detail.chatVotes'),
    voted: t('detail.chatVoted'),
    completeItem: t('detail.chatCompleteItem'),
  };
}

function buildGroupMediaMessageFormData(
  groupId: string,
  input: ChatMessageInput,
) {
  const formData = new FormData();
  formData.set('groupId', groupId);
  formData.set('message', input.body);
  formData.set('kind', 'media');

  if (input.attachment) {
    formData.set('attachment', input.attachment);
  }

  return formData;
}

function UserRow({
  user,
  children,
}: {
  user: GroupUserSummary;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar imageUrl={user.imageUrl} displayName={user.displayName} />
        <div className="min-w-0">
          <p className="truncate font-medium">{user.displayName}</p>
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">
            {formatProfileTag(user.tag)}
          </p>
        </div>
      </div>
      {children}
    </div>
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
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="40px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </div>
  );
}

function formatGroupMessageDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
