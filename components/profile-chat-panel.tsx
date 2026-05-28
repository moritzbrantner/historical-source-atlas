'use client';

import Image from 'next/image';
import { useState } from 'react';

import {
  ChatMessageComposer,
  ChatMessageContent,
  PinMessageButton,
  PinnedMessagesSummary,
  type ChatMessageLabels,
} from '@/components/chat-message-tools';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChatMessageInput } from '@/src/domain/chat/messages';
import type {
  ProfileChatMessage,
  ProfileDirectoryEntry,
} from '@/src/domain/profile/use-cases';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type ProfileChatPanelProps = {
  currentUserId: string;
  member: ProfileDirectoryEntry;
  initialMessages: ProfileChatMessage[];
};

type SendMessageResponse = {
  message?: ProfileChatMessage;
};

type UpdateMessageResponse = {
  message?: ProfileChatMessage;
};

export function ProfileChatPanel({
  currentUserId,
  member,
  initialMessages,
}: ProfileChatPanelProps) {
  const t = useTranslations('ProfileChatPage');
  const [messages, setMessages] = useState(initialMessages);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [updatingMessageId, setUpdatingMessageId] = useState<string | null>(
    null,
  );

  async function sendMessage(input: ChatMessageInput) {
    setIsSending(true);
    setFeedback(null);
    setError(null);

    try {
      const body = input.attachment
        ? buildMediaMessageFormData(member.userId, input)
        : JSON.stringify({
            userId: member.userId,
            message: input.body,
            kind: input.kind,
            options: input.options,
            items: input.items,
          });
      const response = await fetch('/api/profile/message', {
        method: 'POST',
        headers: input.attachment
          ? undefined
          : {
              'content-type': 'application/json',
            },
        body,
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, t('error'));
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as SendMessageResponse;
      if (payload.message) {
        setMessages((currentMessages) => [
          ...currentMessages,
          payload.message!,
        ]);
      }
      setFeedback(t('sent'));
    } catch {
      setError(t('error'));
    } finally {
      setIsSending(false);
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
      const response = await fetch('/api/profile/message', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ messageId, ...input }),
      });

      if (!response.ok) {
        const problem = await readProblemDetail(response, t('error'));
        setError(problem.message);
        return;
      }

      const payload = (await response.json()) as UpdateMessageResponse;

      if (payload.message) {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === payload.message!.id ? payload.message! : message,
          ),
        );
      }
    } catch {
      setError(t('error'));
    } finally {
      setUpdatingMessageId(null);
    }
  }

  const labels = getProfileChatLabels(t);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar imageUrl={member.imageUrl} displayName={member.displayName} />
        <CardTitle>
          {t('conversationWith', { name: member.displayName })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PinnedMessagesSummary messages={messages} labels={labels} />

        <div className="max-h-[32rem] space-y-3 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isOwnMessage = message.senderUserId === currentUserId;

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
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <ChatMessageContent
                          message={message}
                          currentUserId={currentUserId}
                          labels={labels}
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
                        labels={labels}
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
                      {formatChatMessageDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t('noMessages')}
            </p>
          )}
        </div>

        {feedback ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {feedback}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <ChatMessageComposer
          labels={labels}
          isSending={isSending}
          onSubmit={sendMessage}
        />
      </CardContent>
    </Card>
  );
}

function getProfileChatLabels(
  t: ReturnType<typeof useTranslations>,
): ChatMessageLabels {
  return {
    textMode: t('composer.text'),
    pollMode: t('composer.poll'),
    todoMode: t('composer.todo'),
    attachMedia: t('composer.attachMedia'),
    attachmentSelected: t('composer.attachmentSelected'),
    removeAttachment: t('composer.removeAttachment'),
    openAttachment: t('composer.openAttachment'),
    messagePlaceholder: t('messagePlaceholder'),
    pollPlaceholder: t('composer.pollPlaceholder'),
    todoPlaceholder: t('composer.todoPlaceholder'),
    send: t('send'),
    sending: t('sending'),
    pinned: t('pinned'),
    pin: t('pin'),
    unpin: t('unpin'),
    voteFor: t('voteFor'),
    votes: t('votes'),
    voted: t('voted'),
    completeItem: t('completeItem'),
  };
}

function buildMediaMessageFormData(userId: string, input: ChatMessageInput) {
  const formData = new FormData();
  formData.set('userId', userId);
  formData.set('message', input.body);
  formData.set('kind', 'media');

  if (input.attachment) {
    formData.set('attachment', input.attachment);
  }

  return formData;
}

function Avatar({
  imageUrl,
  displayName,
}: {
  imageUrl: string | null;
  displayName: string;
}) {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="44px"
          unoptimized
          className="object-cover"
        />
      ) : (
        <span>{displayName.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </div>
  );
}

function formatChatMessageDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
