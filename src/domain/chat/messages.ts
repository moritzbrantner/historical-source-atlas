export const chatMessageKinds = ['text', 'poll', 'todo', 'media'] as const;

export type ChatMessageKind = (typeof chatMessageKinds)[number];

export const chatMediaTypes = ['photo', 'audio', 'video'] as const;

export type ChatMediaType = (typeof chatMediaTypes)[number];

export type PollOption = {
  id: string;
  text: string;
  voterUserIds: string[];
};

export type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
  completedByUserId: string | null;
};

export type ChatMediaAttachment = {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  type: ChatMediaType;
};

export type ChatMessageMetadata = {
  poll?: {
    options: PollOption[];
  };
  todo?: {
    items: TodoItem[];
  };
  media?: ChatMediaAttachment;
};

export type ChatMessageInput = {
  body: string;
  kind?: ChatMessageKind;
  options?: string[];
  items?: string[];
  attachment?: File;
};

export type NormalizedChatMessageInput = {
  body: string;
  kind: ChatMessageKind;
  metadata: ChatMessageMetadata;
};

const MESSAGE_MAX_LENGTH = 500;
const POLL_MIN_OPTIONS = 2;
const POLL_MAX_OPTIONS = 8;
const POLL_OPTION_MAX_LENGTH = 80;
const TODO_MIN_ITEMS = 1;
const TODO_MAX_ITEMS = 20;
const TODO_ITEM_MAX_LENGTH = 120;

export function isChatMessageKind(value: unknown): value is ChatMessageKind {
  return (
    typeof value === 'string' &&
    chatMessageKinds.includes(value as ChatMessageKind)
  );
}

export function normalizeChatMessageInput(
  input: string | ChatMessageInput,
):
  | { ok: true; value: NormalizedChatMessageInput }
  | { ok: false; error: string } {
  const structuredInput =
    typeof input === 'string' ? { body: input, kind: 'text' as const } : input;
  const body = structuredInput.body.trim();
  const kind = structuredInput.kind ?? 'text';

  if (!isChatMessageKind(kind)) {
    return { ok: false, error: 'Unsupported message type.' };
  }

  if (kind === 'media') {
    return { ok: false, error: 'Attach a photo, audio, or video.' };
  }

  if (body.length < 1 || body.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Messages must be between 1 and ${MESSAGE_MAX_LENGTH} characters.`,
    };
  }

  if (kind === 'text') {
    return { ok: true, value: { body, kind, metadata: {} } };
  }

  if (kind === 'poll') {
    const options = uniqueNonEmptyLines(structuredInput.options ?? []);

    if (
      options.length < POLL_MIN_OPTIONS ||
      options.length > POLL_MAX_OPTIONS
    ) {
      return {
        ok: false,
        error: `Polls need between ${POLL_MIN_OPTIONS} and ${POLL_MAX_OPTIONS} options.`,
      };
    }

    const tooLong = options.some(
      (option) => option.length > POLL_OPTION_MAX_LENGTH,
    );

    if (tooLong) {
      return {
        ok: false,
        error: `Poll options must be ${POLL_OPTION_MAX_LENGTH} characters or fewer.`,
      };
    }

    return {
      ok: true,
      value: {
        body,
        kind,
        metadata: {
          poll: {
            options: options.map((option) => ({
              id: crypto.randomUUID(),
              text: option,
              voterUserIds: [],
            })),
          },
        },
      },
    };
  }

  const items = uniqueNonEmptyLines(structuredInput.items ?? []);

  if (items.length < TODO_MIN_ITEMS || items.length > TODO_MAX_ITEMS) {
    return {
      ok: false,
      error: `Todo lists need between ${TODO_MIN_ITEMS} and ${TODO_MAX_ITEMS} items.`,
    };
  }

  const tooLong = items.some((item) => item.length > TODO_ITEM_MAX_LENGTH);

  if (tooLong) {
    return {
      ok: false,
      error: `Todo items must be ${TODO_ITEM_MAX_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    value: {
      body,
      kind,
      metadata: {
        todo: {
          items: items.map((item) => ({
            id: crypto.randomUUID(),
            text: item,
            completed: false,
            completedByUserId: null,
          })),
        },
      },
    },
  };
}

export function parseChatMessageMetadata(
  kind: ChatMessageKind,
  value: unknown,
): ChatMessageMetadata {
  if (!isRecord(value)) {
    return {};
  }

  if (kind === 'poll') {
    const poll = isRecord(value.poll) ? value.poll : value;
    const options = Array.isArray(poll.options)
      ? poll.options
          .map((option) => parsePollOption(option))
          .filter((option): option is PollOption => option !== null)
      : [];

    return options.length > 0 ? { poll: { options } } : {};
  }

  if (kind === 'todo') {
    const todo = isRecord(value.todo) ? value.todo : value;
    const items = Array.isArray(todo.items)
      ? todo.items
          .map((item) => parseTodoItem(item))
          .filter((item): item is TodoItem => item !== null)
      : [];

    return items.length > 0 ? { todo: { items } } : {};
  }

  if (kind === 'media') {
    const media = isRecord(value.media) ? value.media : value;
    const attachment = parseChatMediaAttachment(media);

    return attachment ? { media: attachment } : {};
  }

  return {};
}

export function voteInPollMetadata(
  metadata: ChatMessageMetadata,
  optionId: string,
  actorUserId: string,
): ChatMessageMetadata | null {
  const options = metadata.poll?.options;

  if (!options?.some((option) => option.id === optionId)) {
    return null;
  }

  return {
    poll: {
      options: options.map((option) => ({
        ...option,
        voterUserIds:
          option.id === optionId
            ? Array.from(new Set([...option.voterUserIds, actorUserId]))
            : option.voterUserIds.filter((userId) => userId !== actorUserId),
      })),
    },
  };
}

export function toggleTodoMetadata(
  metadata: ChatMessageMetadata,
  itemId: string,
  actorUserId: string,
  completed: boolean,
): ChatMessageMetadata | null {
  const items = metadata.todo?.items;

  if (!items?.some((item) => item.id === itemId)) {
    return null;
  }

  return {
    todo: {
      items: items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed,
              completedByUserId: completed ? actorUserId : null,
            }
          : item,
      ),
    },
  };
}

function uniqueNonEmptyLines(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const item = value.trim().replace(/\s+/g, ' ');

    if (!item || seen.has(item.toLocaleLowerCase())) {
      continue;
    }

    seen.add(item.toLocaleLowerCase());
    normalized.push(item);
  }

  return normalized;
}

function parsePollOption(value: unknown): PollOption | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const text = typeof value.text === 'string' ? value.text.trim() : '';

  if (!text) {
    return null;
  }

  return {
    id: value.id,
    text,
    voterUserIds: Array.isArray(value.voterUserIds)
      ? value.voterUserIds.filter(
          (userId): userId is string => typeof userId === 'string',
        )
      : [],
  };
}

function parseTodoItem(value: unknown): TodoItem | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const text = typeof value.text === 'string' ? value.text.trim() : '';

  if (!text) {
    return null;
  }

  return {
    id: value.id,
    text,
    completed: value.completed === true,
    completedByUserId:
      typeof value.completedByUserId === 'string'
        ? value.completedByUserId
        : null,
  };
}

function parseChatMediaAttachment(value: unknown): ChatMediaAttachment | null {
  if (!isRecord(value)) {
    return null;
  }

  const type =
    typeof value.type === 'string' &&
    chatMediaTypes.includes(value.type as ChatMediaType)
      ? (value.type as ChatMediaType)
      : null;
  const key = typeof value.key === 'string' ? value.key.trim() : '';
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  const filename =
    typeof value.filename === 'string' ? value.filename.trim() : '';
  const mimeType =
    typeof value.mimeType === 'string' ? value.mimeType.trim() : '';
  const size = typeof value.size === 'number' ? value.size : 0;

  if (!type || !key || !url || !filename || !mimeType || size <= 0) {
    return null;
  }

  return {
    key,
    url,
    filename,
    mimeType,
    size,
    type,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
