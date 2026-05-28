import { describe, expect, it } from 'vitest';

import {
  normalizeChatMessageInput,
  parseChatMessageMetadata,
} from '@/src/domain/chat/messages';

describe('chat messages', () => {
  it('keeps direct text normalization from creating media messages', () => {
    const result = normalizeChatMessageInput({
      body: 'photo',
      kind: 'media',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Attach a photo, audio, or video.',
    });
  });

  it('parses media attachments from message metadata', () => {
    const metadata = parseChatMessageMetadata('media', {
      media: {
        key: 'chat-media/user/asset.jpg',
        url: 'https://cdn.example.com/chat-media/user/asset.jpg',
        filename: 'asset.jpg',
        mimeType: 'image/jpeg',
        size: 1234,
        type: 'photo',
      },
    });

    expect(metadata).toEqual({
      media: {
        key: 'chat-media/user/asset.jpg',
        url: 'https://cdn.example.com/chat-media/user/asset.jpg',
        filename: 'asset.jpg',
        mimeType: 'image/jpeg',
        size: 1234,
        type: 'photo',
      },
    });
  });
});
