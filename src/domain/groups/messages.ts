import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  normalizeChatMessageInput,
  parseChatMessageMetadata,
  toggleTodoMetadata,
  voteInPollMetadata,
  type ChatMessageInput,
  type ChatMessageMetadata,
} from '@/src/domain/chat/messages';
import {
  ChatMediaValidationError,
  validateChatMediaUpload,
} from '@/src/domain/chat/media';
import {
  deleteProfileImage,
  uploadChatMedia,
} from '@/src/profile/object-storage';
import {
  GROUP_MESSAGE_MAX_LENGTH,
  type GroupChatMessage,
  type GroupError,
  type GroupUseCaseDeps,
  resolveChatMessageKind,
  toChatMessage,
} from './shared';
import { getGroupUseCaseDeps } from './default-deps';

export async function getGroupMessagesUseCase(
  actorUserId: string,
  groupId: string,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ messages: GroupChatMessage[] }, GroupError>> {
  const [group, membership] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  const messages = await deps.listMessages(groupId);

  return success({
    messages: messages.map(toChatMessage),
  });
}

export async function sendGroupMessageUseCase(
  actorUserId: string,
  groupId: string,
  input: string | ChatMessageInput,
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ message: GroupChatMessage }, GroupError>> {
  const normalizedMessage = normalizeChatMessageInput(input);

  if (!normalizedMessage.ok) {
    return failure({
      code: 'VALIDATION_ERROR',
      message:
        normalizedMessage.error ===
        'Messages must be between 1 and 500 characters.'
          ? `Messages must be between 1 and ${GROUP_MESSAGE_MAX_LENGTH} characters.`
          : normalizedMessage.error,
    });
  }

  const [group, membership, actor] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
    deps.findUserById(actorUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  if (!actor) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const message = await deps.createMessage({
    id: crypto.randomUUID(),
    groupId,
    senderUserId: actorUserId,
    body: normalizedMessage.value.body,
    kind: normalizedMessage.value.kind,
    metadata: normalizedMessage.value.metadata,
    createdAt: new Date(),
  });

  return success({
    message: toChatMessage({
      ...message,
      sender: actor,
    }),
  });
}

export async function sendGroupMediaMessageUseCase(
  actorUserId: string,
  groupId: string,
  input: { body?: string; file: File },
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ message: GroupChatMessage }, GroupError>> {
  const caption = input.body?.trim() ?? '';

  if (caption.length > GROUP_MESSAGE_MAX_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Messages must be ${GROUP_MESSAGE_MAX_LENGTH} characters or fewer.`,
    });
  }

  const [group, membership, actor] = await Promise.all([
    deps.findGroupById(groupId),
    deps.findMembership(groupId, actorUserId),
    deps.findUserById(actorUserId),
  ]);

  if (!group) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Group was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  if (!actor) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  try {
    const validated = await validateChatMediaUpload(input.file);
    const uploaded = await uploadChatMedia(actorUserId, validated);

    try {
      const message = await deps.createMessage({
        id: crypto.randomUUID(),
        groupId,
        senderUserId: actorUserId,
        body: caption || validated.filename,
        kind: 'media',
        metadata: {
          media: {
            key: uploaded.key,
            url: uploaded.url,
            filename: validated.filename,
            mimeType: validated.mimeType,
            size: validated.size,
            type: validated.type,
          },
        },
        createdAt: new Date(),
      });

      return success({
        message: toChatMessage({
          ...message,
          sender: actor,
        }),
      });
    } catch (error) {
      await deleteProfileImage(uploaded.key);
      throw error;
    }
  } catch (error) {
    if (error instanceof ChatMediaValidationError) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function updateGroupChatMessageUseCase(
  actorUserId: string,
  input: {
    groupId: string;
    messageId: string;
    action: 'pin' | 'unpin' | 'vote-poll' | 'toggle-todo';
    optionId?: string;
    itemId?: string;
    completed?: boolean;
  },
  deps: GroupUseCaseDeps = getGroupUseCaseDeps(),
): Promise<ServiceResult<{ message: GroupChatMessage }, GroupError>> {
  const [message, membership, actor] = await Promise.all([
    deps.findMessageById(input.messageId),
    deps.findMembership(input.groupId, actorUserId),
    deps.findUserById(actorUserId),
  ]);

  if (!message || message.groupId !== input.groupId) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  if (!membership) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You are not a member of this group.',
    });
  }

  if (!actor) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const kind = resolveChatMessageKind(message.kind);
  const metadata = parseChatMessageMetadata(kind, message.metadata);
  let update: { metadata?: ChatMessageMetadata; pinnedAt?: Date | null };

  if (input.action === 'pin' || input.action === 'unpin') {
    update = {
      pinnedAt: input.action === 'pin' ? new Date() : null,
    };
  } else if (input.action === 'vote-poll') {
    if (kind !== 'poll' || !input.optionId) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a poll option.',
      });
    }

    const updatedMetadata = voteInPollMetadata(
      metadata,
      input.optionId,
      actorUserId,
    );

    if (!updatedMetadata) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a poll option.',
      });
    }

    update = { metadata: updatedMetadata };
  } else {
    if (kind !== 'todo' || !input.itemId || input.completed === undefined) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a todo item.',
      });
    }

    const updatedMetadata = toggleTodoMetadata(
      metadata,
      input.itemId,
      actorUserId,
      input.completed,
    );

    if (!updatedMetadata) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: 'Choose a todo item.',
      });
    }

    update = { metadata: updatedMetadata };
  }

  const updatedMessage = await deps.updateMessage(input.messageId, update);

  if (!updatedMessage) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  return success({
    message: toChatMessage({
      ...updatedMessage,
      sender: actor,
    }),
  });
}
