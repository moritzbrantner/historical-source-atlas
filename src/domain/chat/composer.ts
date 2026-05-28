import type {
  ChatMessageInput,
  ChatMessageKind,
} from '@/src/domain/chat/messages';

export type ChatComposerStructuredKind = Extract<
  ChatMessageKind,
  'poll' | 'todo'
>;

const structuredEntryPrefix = '- ';

export function applyChatComposerSlashCommand(
  draft: string,
): { kind: ChatComposerStructuredKind; draft: string } | null {
  const match = draft.match(/^\/(poll|todo)(?=$|\s)/);

  if (!match) {
    return null;
  }

  const command = match[1];
  const nextDraft = draft
    .slice(match[0].length)
    .replace(/^[^\S\n]*(?:\r?\n)?/, '');

  return {
    kind: command === 'poll' ? 'poll' : 'todo',
    draft: nextDraft,
  };
}

export function buildChatMessageInput(
  kind: ChatMessageKind,
  draft: string,
  attachment: File | null,
): ChatMessageInput | null {
  if (attachment) {
    return { body: draft.trim(), kind: 'media', attachment };
  }

  const lines = draft
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (kind === 'text') {
    const body = draft.trim();
    return body ? { body, kind } : null;
  }

  const [body, ...entryLines] = lines;

  if (!body) {
    return null;
  }

  const entries = entryLines
    .filter((line) => line.startsWith(structuredEntryPrefix))
    .map((line) => line.slice(structuredEntryPrefix.length).trim())
    .filter(Boolean);

  if (kind === 'poll') {
    return entries.length >= 2 ? { body, kind, options: entries } : null;
  }

  return entries.length >= 1 ? { body, kind, items: entries } : null;
}
