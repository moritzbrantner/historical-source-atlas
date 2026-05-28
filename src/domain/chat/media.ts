import type { ChatMediaType } from '@/src/domain/chat/messages';

const MAX_CHAT_MEDIA_UPLOAD_BYTES = 25 * 1024 * 1024;

const ALLOWED_CHAT_MEDIA_MIME_TYPES = {
  'image/jpeg': 'photo',
  'image/png': 'photo',
  'image/webp': 'photo',
  'image/gif': 'photo',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/aac': 'audio',
  'audio/ogg': 'audio',
  'audio/webm': 'audio',
  'audio/wav': 'audio',
  'audio/x-wav': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
} as const satisfies Record<string, ChatMediaType>;

export class ChatMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatMediaValidationError';
  }
}

export type ValidatedChatMediaUpload = {
  bytes: Uint8Array;
  filename: string;
  mimeType: keyof typeof ALLOWED_CHAT_MEDIA_MIME_TYPES;
  size: number;
  type: ChatMediaType;
};

export async function validateChatMediaUpload(
  file: File,
): Promise<ValidatedChatMediaUpload> {
  if (!file.size) {
    throw new ChatMediaValidationError('Please select a media file.');
  }

  if (file.size > MAX_CHAT_MEDIA_UPLOAD_BYTES) {
    throw new ChatMediaValidationError('Media files must be 25MB or smaller.');
  }

  const mediaType =
    ALLOWED_CHAT_MEDIA_MIME_TYPES[
      file.type as keyof typeof ALLOWED_CHAT_MEDIA_MIME_TYPES
    ];

  if (!mediaType) {
    throw new ChatMediaValidationError(
      'Only photo, audio, and video files are supported.',
    );
  }

  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    filename: sanitizeFilename(file.name),
    mimeType: file.type as keyof typeof ALLOWED_CHAT_MEDIA_MIME_TYPES,
    size: file.size,
    type: mediaType,
  };
}

export function extensionForChatMediaMime(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/mp4':
      return 'm4a';
    case 'audio/aac':
      return 'aac';
    case 'audio/ogg':
      return 'ogg';
    case 'audio/webm':
      return 'webm';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/quicktime':
      return 'mov';
    default:
      return 'bin';
  }
}

export const chatMediaConstraints = {
  maxUploadBytes: MAX_CHAT_MEDIA_UPLOAD_BYTES,
  allowedMimeTypes: Object.keys(ALLOWED_CHAT_MEDIA_MIME_TYPES),
};

function sanitizeFilename(filename: string) {
  const trimmed = filename.trim();

  if (!trimmed) {
    return 'attachment';
  }

  return trimmed
    .replace(/[^\x20-\x7e]/g, '-')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}
