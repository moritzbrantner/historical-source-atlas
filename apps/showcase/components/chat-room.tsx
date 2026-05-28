'use client';

import { Badge, Button, cn, Input, Textarea } from '@moritzbrantner/ui';
import {
  ImageIcon,
  Link2,
  MessageCircle,
  Search,
  Send,
  SmilePlus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type ChatLabels = {
  title: string;
  status: string;
  searchConversations: string;
  rooms: string;
  members: string;
  activeNow: string;
  messagePlaceholder: string;
  send: string;
  openGifPicker: string;
  closeGifPicker: string;
  gifSearchPlaceholder: string;
  gifSearchEmpty: string;
  gifSearchLoading: string;
  gifSearchUnavailable: string;
  gifSearchError: string;
  selectGif: string;
  selectedGif: string;
  removeGif: string;
  tenorAttribution: string;
  tenorLinkAttached: string;
  pastedTenorLink: string;
  conversations: {
    design: string;
    product: string;
    support: string;
  };
  users: {
    you: string;
    mara: string;
    leon: string;
    priya: string;
    noah: string;
    ava: string;
  };
  roles: {
    productDesigner: string;
    frontendLead: string;
    productManager: string;
    supportOps: string;
    qaEngineer: string;
  };
  sampleMessages: {
    design1: string;
    design2: string;
    product1: string;
    product2: string;
    support1: string;
    support2: string;
    autoReply: string;
  };
};

type ChatRoomProps = {
  locale: string;
  tenorEnabled: boolean;
  labels: ChatLabels;
};

type Conversation = {
  id: string;
  title: string;
  accent: string;
  memberIds: string[];
};

type ChatUser = {
  id: string;
  name: string;
  role: string;
  color: string;
  online: boolean;
};

type TenorGif = {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
  tenorUrl: string;
  width: number;
  height: number;
  query?: string;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sentAt: string;
  gif?: TenorGif;
};

type TenorSearchResponse = {
  configured: boolean;
  results: TenorGif[];
};

const CURRENT_USER_ID = 'you';
const STORAGE_KEY = 'showcase-chat-messages';

function createUsers(labels: ChatLabels): ChatUser[] {
  return [
    {
      id: 'you',
      name: labels.users.you,
      role: labels.roles.frontendLead,
      color: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950',
      online: true,
    },
    {
      id: 'mara',
      name: labels.users.mara,
      role: labels.roles.productDesigner,
      color: 'bg-emerald-500 text-white',
      online: true,
    },
    {
      id: 'leon',
      name: labels.users.leon,
      role: labels.roles.frontendLead,
      color: 'bg-sky-500 text-white',
      online: true,
    },
    {
      id: 'priya',
      name: labels.users.priya,
      role: labels.roles.productManager,
      color: 'bg-rose-500 text-white',
      online: true,
    },
    {
      id: 'noah',
      name: labels.users.noah,
      role: labels.roles.supportOps,
      color: 'bg-amber-500 text-zinc-950',
      online: false,
    },
    {
      id: 'ava',
      name: labels.users.ava,
      role: labels.roles.qaEngineer,
      color: 'bg-violet-500 text-white',
      online: true,
    },
  ];
}

function createConversations(labels: ChatLabels): Conversation[] {
  return [
    {
      id: 'design',
      title: labels.conversations.design,
      accent: 'bg-emerald-500',
      memberIds: ['you', 'mara', 'leon', 'priya'],
    },
    {
      id: 'product',
      title: labels.conversations.product,
      accent: 'bg-rose-500',
      memberIds: ['you', 'priya', 'ava'],
    },
    {
      id: 'support',
      title: labels.conversations.support,
      accent: 'bg-amber-500',
      memberIds: ['you', 'noah', 'ava'],
    },
  ];
}

function createInitialMessages(labels: ChatLabels): ChatMessage[] {
  return [
    {
      id: 'm-1',
      conversationId: 'design',
      senderId: 'mara',
      body: labels.sampleMessages.design1,
      sentAt: '09:41',
    },
    {
      id: 'm-2',
      conversationId: 'design',
      senderId: 'leon',
      body: labels.sampleMessages.design2,
      sentAt: '09:43',
    },
    {
      id: 'm-3',
      conversationId: 'product',
      senderId: 'priya',
      body: labels.sampleMessages.product1,
      sentAt: '10:12',
    },
    {
      id: 'm-4',
      conversationId: 'product',
      senderId: 'ava',
      body: labels.sampleMessages.product2,
      sentAt: '10:15',
    },
    {
      id: 'm-5',
      conversationId: 'support',
      senderId: 'noah',
      body: labels.sampleMessages.support1,
      sentAt: '11:02',
    },
    {
      id: 'm-6',
      conversationId: 'support',
      senderId: 'ava',
      body: labels.sampleMessages.support2,
      sentAt: '11:07',
    },
  ];
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function nowLabel() {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function parseTenorUrl(value: string) {
  const [match] = value.match(/https?:\/\/[^\s]+/i) ?? [];

  if (!match) {
    return null;
  }

  try {
    const url = new URL(match);
    const host = url.hostname.replace(/^www\./, '');

    if (
      host !== 'tenor.com' &&
      host !== 'media.tenor.com' &&
      !host.endsWith('.tenor.com')
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isDirectTenorMedia(url: string) {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname.endsWith('tenor.com') &&
      /\.(gif|webp|png|jpe?g)$/i.test(parsedUrl.pathname)
    );
  } catch {
    return false;
  }
}

function getLocaleKey(locale: string) {
  return locale.startsWith('de') ? 'de_DE' : 'en_US';
}

export function ChatRoom({ locale, tenorEnabled, labels }: ChatRoomProps) {
  const users = useMemo(() => createUsers(labels), [labels]);
  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );
  const conversations = useMemo(() => createConversations(labels), [labels]);
  const initialMessages = useMemo(
    () => createInitialMessages(labels),
    [labels],
  );
  const [selectedConversationId, setSelectedConversationId] = useState(
    conversations[0]?.id ?? 'design',
  );
  const [conversationSearch, setConversationSearch] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isHydrated, setIsHydrated] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('excited');
  const [gifResults, setGifResults] = useState<TenorGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);
  const [tenorConfigured, setTenorConfigured] = useState<boolean | null>(
    tenorEnabled,
  );
  const [selectedGif, setSelectedGif] = useState<TenorGif | null>(null);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation =
    conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    ) ?? conversations[0];
  const visibleMessages = messages.filter(
    (message) => message.conversationId === selectedConversation.id,
  );
  const activeMembers = selectedConversation.memberIds
    .map((memberId) => usersById.get(memberId))
    .filter((user): user is ChatUser => Boolean(user));
  const filteredConversations = conversations.filter((conversation) =>
    conversation.title
      .toLowerCase()
      .includes(conversationSearch.trim().toLowerCase()),
  );
  const pastedTenorUrl = parseTenorUrl(messageDraft);
  const gifPickerLabel = !tenorEnabled
    ? labels.gifSearchUnavailable
    : gifPickerOpen
      ? labels.closeGifPicker
      : labels.openGifPicker;

  useEffect(() => {
    setIsHydrated(true);

    try {
      const savedMessages = window.localStorage.getItem(STORAGE_KEY);

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages) as ChatMessage[];
        setMessages(parsedMessages);
      }
    } catch {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [isHydrated, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  });

  useEffect(() => {
    setTenorConfigured(tenorEnabled);

    if (!tenorEnabled) {
      setGifPickerOpen(false);
      setGifResults([]);
      setGifLoading(false);
      setGifError(null);
    }
  }, [tenorEnabled]);

  useEffect(() => {
    if (!tenorEnabled || !gifPickerOpen || !gifQuery.trim()) {
      return;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setGifLoading(true);
      setGifError(null);

      try {
        const params = new URLSearchParams({
          q: gifQuery.trim(),
          locale: getLocaleKey(locale),
        });
        const response = await fetch(`/api/tenor/search?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Tenor search failed');
        }

        const data = (await response.json()) as TenorSearchResponse;
        setTenorConfigured(data.configured);
        setGifResults(data.results ?? []);
      } catch {
        if (!abortController.signal.aborted) {
          setGifError(labels.gifSearchError);
          setGifResults([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setGifLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [gifPickerOpen, gifQuery, labels.gifSearchError, locale, tenorEnabled]);

  function sendTenorShare(gif: TenorGif) {
    if (!tenorEnabled || !gif.id || !gif.query) {
      return;
    }

    void fetch('/api/tenor/register-share', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: gif.id,
        q: gif.query,
        locale: getLocaleKey(locale),
      }),
    }).catch(() => undefined);
  }

  function appendMessage(message: ChatMessage) {
    setMessages((currentMessages) => [...currentMessages, message]);
  }

  function queueAutoReply(conversationId: string) {
    const replyUser = conversations
      .find((conversation) => conversation.id === conversationId)
      ?.memberIds.map((memberId) => usersById.get(memberId))
      .find((user) => user && user.id !== CURRENT_USER_ID && user.online);

    if (!replyUser) {
      return;
    }

    setTypingUserId(replyUser.id);

    window.setTimeout(() => {
      setTypingUserId(null);
      appendMessage({
        id: crypto.randomUUID(),
        conversationId,
        senderId: replyUser.id,
        body: labels.sampleMessages.autoReply,
        sentAt: nowLabel(),
      });
    }, 900);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDraft = messageDraft.trim();
    const tenorUrl = parseTenorUrl(trimmedDraft);
    const pastedGif = tenorUrl
      ? {
          id: `pasted-${Date.now()}`,
          title: labels.pastedTenorLink,
          previewUrl: isDirectTenorMedia(tenorUrl) ? tenorUrl : '',
          gifUrl: isDirectTenorMedia(tenorUrl) ? tenorUrl : '',
          tenorUrl,
          width: 320,
          height: 240,
        }
      : null;
    const gif = selectedGif ?? pastedGif;

    if (!trimmedDraft && !gif) {
      return;
    }

    appendMessage({
      id: crypto.randomUUID(),
      conversationId: selectedConversation.id,
      senderId: CURRENT_USER_ID,
      body: trimmedDraft,
      sentAt: nowLabel(),
      gif: gif ?? undefined,
    });

    if (selectedGif) {
      sendTenorShare(selectedGif);
    }

    setMessageDraft('');
    setSelectedGif(null);
    setGifPickerOpen(false);
    queueAutoReply(selectedConversation.id);
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
            <MessageCircle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {labels.title}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {labels.status}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="rounded-md">
          {activeMembers.filter((member) => member.online).length}{' '}
          {labels.activeNow}
        </Badge>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_15rem]">
        <aside className="border-b border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40 lg:border-r lg:border-b-0">
          <label className="sr-only" htmlFor="conversation-search">
            {labels.searchConversations}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <Input
              id="conversation-search"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder={labels.searchConversations}
              className="h-10 rounded-lg bg-white pl-9 dark:bg-zinc-950"
            />
          </div>

          <div className="mt-4 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              {labels.rooms}
            </p>
          </div>

          <div className="mt-2 space-y-1">
            {filteredConversations.map((conversation) => {
              const latestMessage = [...messages]
                .reverse()
                .find((message) => message.conversationId === conversation.id);
              const isSelected = conversation.id === selectedConversation.id;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
                    isSelected
                      ? 'bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800'
                      : 'hover:bg-white/80 dark:hover:bg-zinc-950/70',
                  )}
                >
                  <span
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      conversation.accent,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {conversation.title}
                    </span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {latestMessage?.body ||
                        latestMessage?.gif?.title ||
                        labels.selectedGif}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-[38rem] min-w-0 flex-col bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-semibold">
                {selectedConversation.title}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {activeMembers.map((member) => member.name).join(', ')}
              </p>
            </div>
            <div className="hidden -space-x-2 md:flex">
              {activeMembers.slice(0, 4).map((member) => (
                <Avatar key={member.id} user={member} />
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-zinc-50/60 p-4 dark:bg-zinc-900/30">
            {visibleMessages.map((message) => {
              const sender = usersById.get(message.senderId);
              const isCurrentUser = message.senderId === CURRENT_USER_ID;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    isCurrentUser ? 'justify-end' : 'justify-start',
                  )}
                >
                  {!isCurrentUser && sender ? <Avatar user={sender} /> : null}
                  <div
                    className={cn(
                      'max-w-[82%] space-y-1 sm:max-w-[70%]',
                      isCurrentUser && 'items-end',
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-baseline gap-2',
                        isCurrentUser ? 'justify-end' : 'justify-start',
                      )}
                    >
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {sender?.name ?? labels.users.you}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {message.sentAt}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'overflow-hidden rounded-lg border px-3 py-2 text-sm leading-6 shadow-sm',
                        isCurrentUser
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950'
                          : 'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
                      )}
                    >
                      {message.body ? (
                        <p className="whitespace-pre-wrap break-words">
                          {message.body}
                        </p>
                      ) : null}
                      {message.gif ? (
                        <GifPreview gif={message.gif} labels={labels} />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {typingUserId ? (
              <div className="flex items-center gap-2 pl-12 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-zinc-400" />
                  <span className="size-1.5 rounded-full bg-zinc-400" />
                  <span className="size-1.5 rounded-full bg-zinc-400" />
                </span>
                {usersById.get(typingUserId)?.name}
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {selectedGif ? (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
                <img
                  src={selectedGif.previewUrl}
                  alt={selectedGif.title}
                  className="h-16 w-20 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {labels.selectedGif}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedGif.title}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={labels.removeGif}
                  aria-label={labels.removeGif}
                  onClick={() => setSelectedGif(null)}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : null}

            {pastedTenorUrl && !selectedGif ? (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                <Link2 className="size-4" aria-hidden="true" />
                <span className="truncate">{labels.tenorLinkAttached}</span>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant={gifPickerOpen ? 'default' : 'outline'}
                disabled={!tenorEnabled}
                title={gifPickerLabel}
                aria-label={gifPickerLabel}
                onClick={() => {
                  if (tenorEnabled) {
                    setGifPickerOpen((isOpen) => !isOpen);
                  }
                }}
                className="h-11 shrink-0 rounded-lg px-3"
              >
                <SmilePlus className="size-4" aria-hidden="true" />
                <span className="ml-2 hidden sm:inline">GIF</span>
              </Button>
              <Textarea
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder={labels.messagePlaceholder}
                className="min-h-11 flex-1 resize-none rounded-lg"
                rows={1}
              />
              <Button type="submit" className="h-11 shrink-0 rounded-lg px-4">
                <Send className="size-4" aria-hidden="true" />
                <span className="ml-2 hidden sm:inline">{labels.send}</span>
              </Button>
            </div>

            {gifPickerOpen ? (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <label className="sr-only" htmlFor="gif-search">
                  {labels.gifSearchPlaceholder}
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
                    aria-hidden="true"
                  />
                  <Input
                    id="gif-search"
                    value={gifQuery}
                    onChange={(event) => setGifQuery(event.target.value)}
                    placeholder={labels.gifSearchPlaceholder}
                    className="rounded-lg bg-white pl-9 dark:bg-zinc-950"
                  />
                </div>

                <div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                  {gifLoading ? (
                    <GifStatus labels={labels} text={labels.gifSearchLoading} />
                  ) : null}
                  {!gifLoading && tenorConfigured === false ? (
                    <GifStatus
                      labels={labels}
                      text={labels.gifSearchUnavailable}
                    />
                  ) : null}
                  {!gifLoading && gifError ? (
                    <GifStatus labels={labels} text={gifError} />
                  ) : null}
                  {!gifLoading &&
                  tenorConfigured !== false &&
                  !gifError &&
                  gifResults.length === 0 ? (
                    <GifStatus labels={labels} text={labels.gifSearchEmpty} />
                  ) : null}
                  {!gifLoading && !gifError
                    ? gifResults.map((gif) => (
                        <button
                          key={gif.id}
                          type="button"
                          onClick={() => setSelectedGif(gif)}
                          className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-zinc-200 bg-white text-left dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <img
                            src={gif.previewUrl}
                            alt={gif.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-zinc-950/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {labels.selectGif}
                          </span>
                        </button>
                      ))
                    : null}
                </div>

                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {labels.tenorAttribution}
                </p>
              </div>
            ) : null}
          </form>
        </section>

        <aside className="border-t border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 lg:border-t-0 lg:border-l">
          <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
            {labels.members}
          </p>
          <div className="mt-3 space-y-3">
            {activeMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar user={member} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {member.role}
                  </p>
                </div>
                <span
                  className={cn(
                    'size-2 rounded-full',
                    member.online
                      ? 'bg-emerald-500'
                      : 'bg-zinc-300 dark:bg-zinc-700',
                  )}
                />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Avatar({ user }: { user: ChatUser }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-2 ring-white dark:ring-zinc-950',
        user.color,
      )}
    >
      {initials(user.name)}
    </span>
  );
}

function GifPreview({ gif, labels }: { gif: TenorGif; labels: ChatLabels }) {
  const directUrl = gif.gifUrl || gif.previewUrl;

  return (
    <div
      className={cn(
        'mt-2',
        !directUrl && 'rounded-md border border-current/20 p-3',
      )}
    >
      {directUrl ? (
        <a
          href={gif.tenorUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-md"
        >
          <img
            src={directUrl}
            alt={gif.title}
            className="max-h-64 w-full object-cover"
            loading="lazy"
          />
        </a>
      ) : (
        <a
          href={gif.tenorUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 underline underline-offset-4"
        >
          <ImageIcon className="size-4" aria-hidden="true" />
          {labels.pastedTenorLink}
        </a>
      )}
    </div>
  );
}

function GifStatus({ labels, text }: { labels: ChatLabels; text: string }) {
  return (
    <div className="col-span-full flex min-h-24 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
      <ImageIcon className="mr-2 size-4" aria-hidden="true" />
      <span>{text || labels.gifSearchEmpty}</span>
    </div>
  );
}
