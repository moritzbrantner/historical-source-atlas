import { describe, expect, it } from 'vitest';

import {
  ChatMediaValidationError,
  validateChatMediaUpload,
} from '@/src/domain/chat/media';

describe('chat media validation', () => {
  it('accepts supported photo uploads', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', {
      type: 'image/jpeg',
    });

    await expect(validateChatMediaUpload(file)).resolves.toMatchObject({
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 3,
      type: 'photo',
    });
  });

  it('rejects unsupported uploads', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'document.pdf', {
      type: 'application/pdf',
    });

    await expect(validateChatMediaUpload(file)).rejects.toBeInstanceOf(
      ChatMediaValidationError,
    );
  });
});
