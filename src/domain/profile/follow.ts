import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import {
  isChatMessageKind,
  normalizeChatMessageInput,
  parseChatMessageMetadata,
  toggleTodoMetadata,
  voteInPollMetadata,
  type ChatMessageInput,
  type ChatMessageKind,
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
import { buildProfileChatPath } from '@/src/profile/tags';
import {
  type ProfileChatMessage,
  type ProfileChatPayload,
  type ProfileDirectoryEntry,
  type ProfileError,
  type ProfileFollowMutationPayload,
  type ProfileMediaMessageInput,
  type ProfileMessagePayload,
  type ProfileSearchEntry,
  type ProfileUseCaseDeps,
  SEARCH_QUERY_MAX_LENGTH,
  resolveProfileDisplayName,
  toProfileDirectoryEntry,
  toProfileSearchEntry,
} from './shared';
import { getProfileUseCaseDeps } from './default-deps';

async function updateFollowRelationship(
  actorUserId: string,
  targetUserId: string,
  shouldFollow: boolean,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileFollowMutationPayload, ProfileError>> {
  if (actorUserId === targetUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot follow your own profile.',
    });
  }

  const targetUser = await deps.findUserById(targetUserId);

  if (!targetUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (shouldFollow) {
    const blockState = await deps.getBlockRelationshipState(
      actorUserId,
      targetUserId,
    );

    if (blockState.isBlockedByViewer) {
      return failure({
        code: 'FORBIDDEN',
        message: 'Unblock this user before following them.',
      });
    }

    if (blockState.hasBlockedViewer) {
      return failure({
        code: 'FORBIDDEN',
        message: 'You cannot follow this user.',
      });
    }
  }

  if (shouldFollow) {
    await deps.createFollowRelationship(actorUserId, targetUserId);
    return success({
      following: true,
      isFriend: await deps.hasFollowRelationship(targetUserId, actorUserId),
    });
  }

  await deps.deleteFollowRelationship(actorUserId, targetUserId);
  return success({ following: false, isFriend: false });
}

export function followUserUseCase(
  actorUserId: string,
  targetUserId: string,
  deps?: ProfileUseCaseDeps,
) {
  return updateFollowRelationship(actorUserId, targetUserId, true, deps);
}

export function unfollowUserUseCase(
  actorUserId: string,
  targetUserId: string,
  deps?: ProfileUseCaseDeps,
) {
  return updateFollowRelationship(actorUserId, targetUserId, false, deps);
}

export async function sendProfileMessageUseCase(
  actorUserId: string,
  targetUserId: string,
  input: string | ChatMessageInput,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileMessagePayload, ProfileError>> {
  const normalizedMessage = normalizeChatMessageInput(input);

  if (actorUserId === targetUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot message your own profile.',
    });
  }

  if (!normalizedMessage.ok) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: normalizedMessage.error,
    });
  }

  const [senderUser, targetUser] = await Promise.all([
    deps.findUserById(actorUserId),
    deps.findUserById(targetUserId),
  ]);

  if (!senderUser || !targetUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const blockState = await deps.getBlockRelationshipState(
    actorUserId,
    targetUserId,
  );

  if (blockState.isBlockedByViewer || blockState.hasBlockedViewer) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot message this user.',
    });
  }

  const [actorFollowsTarget, targetFollowsActor] = await Promise.all([
    deps.hasFollowRelationship(actorUserId, targetUserId),
    deps.hasFollowRelationship(targetUserId, actorUserId),
  ]);

  if (!actorFollowsTarget || !targetFollowsActor) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You can only message friends.',
    });
  }

  const senderName = resolveProfileDisplayName(senderUser);
  const createdMessage = await deps.createProfileMessageNotification({
    senderUserId: actorUserId,
    targetUserId,
    title: `${senderName} sent you a message`,
    body: normalizedMessage.value.body,
    kind: normalizedMessage.value.kind,
    metadata: normalizedMessage.value.metadata,
    href: buildProfileChatPath(actorUserId),
    createdAt: new Date(),
  });

  return success({
    message: toProfileChatMessage(createdMessage),
  });
}

export async function sendProfileMediaMessageUseCase(
  actorUserId: string,
  targetUserId: string,
  input: ProfileMediaMessageInput,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileMessagePayload, ProfileError>> {
  if (actorUserId === targetUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot message your own profile.',
    });
  }

  const caption = input.body?.trim() ?? '';

  if (caption.length > 500) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Messages must be 500 characters or fewer.',
    });
  }

  const [senderUser, targetUser] = await Promise.all([
    deps.findUserById(actorUserId),
    deps.findUserById(targetUserId),
  ]);

  if (!senderUser || !targetUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const blockState = await deps.getBlockRelationshipState(
    actorUserId,
    targetUserId,
  );

  if (blockState.isBlockedByViewer || blockState.hasBlockedViewer) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot message this user.',
    });
  }

  const [actorFollowsTarget, targetFollowsActor] = await Promise.all([
    deps.hasFollowRelationship(actorUserId, targetUserId),
    deps.hasFollowRelationship(targetUserId, actorUserId),
  ]);

  if (!actorFollowsTarget || !targetFollowsActor) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You can only message friends.',
    });
  }

  try {
    const validated = await validateChatMediaUpload(input.file);
    const uploaded = await uploadChatMedia(actorUserId, validated);
    const body = caption || validated.filename;
    const senderName = resolveProfileDisplayName(senderUser);

    try {
      const createdMessage = await deps.createProfileMessageNotification({
        senderUserId: actorUserId,
        targetUserId,
        title: `${senderName} sent you a ${validated.type}`,
        body,
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
        href: buildProfileChatPath(actorUserId),
        createdAt: new Date(),
      });

      return success({
        message: toProfileChatMessage(createdMessage),
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

export async function updateProfileChatMessageUseCase(
  actorUserId: string,
  input: {
    messageId: string;
    action: 'pin' | 'unpin' | 'vote-poll' | 'toggle-todo';
    optionId?: string;
    itemId?: string;
    completed?: boolean;
  },
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ message: ProfileChatMessage }, ProfileError>> {
  const message = await deps.findProfileMessageById(input.messageId);

  if (!message || !message.actorId) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  if (message.userId !== actorUserId && message.actorId !== actorUserId) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot update this message.',
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

  const updatedMessage = await deps.updateProfileMessage(
    input.messageId,
    update,
  );

  if (!updatedMessage || !updatedMessage.actorId) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Message was not found.',
    });
  }

  return success({ message: toProfileChatMessage(updatedMessage) });
}

export async function getProfileChatUseCase(
  actorUserId: string,
  memberUserId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<ProfileChatPayload, ProfileError>> {
  if (actorUserId === memberUserId) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'You cannot chat with yourself.',
    });
  }

  const [actorUser, memberUser] = await Promise.all([
    deps.findUserById(actorUserId),
    deps.findUserById(memberUserId),
  ]);

  if (!actorUser || !memberUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const blockState = await deps.getBlockRelationshipState(
    actorUserId,
    memberUserId,
  );

  if (blockState.isBlockedByViewer || blockState.hasBlockedViewer) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You cannot chat with this user.',
    });
  }

  const [actorFollowsMember, memberFollowsActor] = await Promise.all([
    deps.hasFollowRelationship(actorUserId, memberUserId),
    deps.hasFollowRelationship(memberUserId, actorUserId),
  ]);

  if (!actorFollowsMember || !memberFollowsActor) {
    return failure({
      code: 'FORBIDDEN',
      message: 'You can only chat with friends.',
    });
  }

  const messages = await deps.listProfileMessagesBetweenUsers(
    actorUserId,
    memberUserId,
  );

  return success({
    member: toProfileDirectoryEntry(memberUser),
    messages: messages
      .filter((message) => message.actorId)
      .map(toProfileChatMessage),
  });
}

function toProfileChatMessage(message: {
  id: string;
  actorId: string | null;
  body: string;
  kind: string;
  metadata: unknown;
  pinnedAt: Date | null;
  createdAt: Date;
}): ProfileChatMessage {
  const kind = resolveChatMessageKind(message.kind);

  return {
    id: message.id,
    senderUserId: message.actorId!,
    body: message.body,
    kind,
    metadata: parseChatMessageMetadata(kind, message.metadata),
    pinnedAt: message.pinnedAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

function resolveChatMessageKind(kind: string): ChatMessageKind {
  return isChatMessageKind(kind) ? kind : 'text';
}

export async function listFollowingProfilesUseCase(
  userId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ profiles: ProfileDirectoryEntry[] }, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const profiles = await deps.listFollowingUsers(userId);

  return success({
    profiles: profiles.map(toProfileDirectoryEntry),
  });
}

export async function listFriendProfilesUseCase(
  userId: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ profiles: ProfileDirectoryEntry[] }, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const profiles = await deps.listFriendUsers(userId);

  return success({
    profiles: profiles.map(toProfileDirectoryEntry),
  });
}

export async function searchUsersToFollowUseCase(
  userId: string,
  rawQuery: string,
  deps: ProfileUseCaseDeps = getProfileUseCaseDeps(),
): Promise<ServiceResult<{ profiles: ProfileSearchEntry[] }, ProfileError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const query = rawQuery.trim();

  if (query.length > SEARCH_QUERY_MAX_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Search must be ${SEARCH_QUERY_MAX_LENGTH} characters or fewer.`,
    });
  }

  const profiles = await deps.searchUsersToFollow(userId, query);

  return success({
    profiles: profiles.map(toProfileSearchEntry),
  });
}

export type {
  ProfileChatMessage,
  ProfileChatPayload,
  ProfileDirectoryEntry,
  ProfileSearchEntry,
} from './shared';
