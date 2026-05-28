import { describe, expect, it } from 'vitest';

import {
  applyChatComposerSlashCommand,
  buildChatMessageInput,
} from '@/src/domain/chat/composer';

describe('chat composer', () => {
  it('switches to poll mode from a leading slash command', () => {
    expect(applyChatComposerSlashCommand('/poll Favorite?\n- A')).toEqual({
      kind: 'poll',
      draft: 'Favorite?\n- A',
    });
  });

  it('switches to todo mode from a leading slash command', () => {
    expect(applyChatComposerSlashCommand('/todo\nChores\n- Sweep')).toEqual({
      kind: 'todo',
      draft: 'Chores\n- Sweep',
    });
  });

  it('ignores slash commands that are not at the beginning', () => {
    expect(applyChatComposerSlashCommand('Please /poll this')).toBeNull();
  });

  it('requires poll options to use dash bullets', () => {
    expect(
      buildChatMessageInput('poll', 'Lunch?\nOption A\nOption B', null),
    ).toBeNull();

    expect(
      buildChatMessageInput('poll', 'Lunch?\n- Tacos\n- Salad', null),
    ).toEqual({
      body: 'Lunch?',
      kind: 'poll',
      options: ['Tacos', 'Salad'],
    });
  });

  it('requires todo items to use dash bullets', () => {
    expect(buildChatMessageInput('todo', 'Chores\nSweep', null)).toBeNull();

    expect(buildChatMessageInput('todo', 'Chores\n- Sweep', null)).toEqual({
      body: 'Chores',
      kind: 'todo',
      items: ['Sweep'],
    });
  });
});
