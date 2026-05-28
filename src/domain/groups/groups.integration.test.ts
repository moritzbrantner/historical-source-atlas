import { describe, expect, it, vi } from 'vitest';

import {
  createGroupUseCase,
  getGroupDetailUseCase,
  getGroupsPageDataUseCase,
  getGroupMessagesUseCase,
  inviteUserToGroupUseCase,
  removeGroupMemberUseCase,
  respondToGroupInvitationUseCase,
  sendGroupMessageUseCase,
  updateGroupChatMessageUseCase,
  updateGroupMemberRoleUseCase,
  type GroupUseCaseDeps,
} from '@/src/domain/groups/use-cases';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function user(id: string, name: string) {
  return {
    id,
    email: `${id}@example.com`,
    tag: id,
    name,
    image: null,
  };
}

function membership(
  groupId: string,
  userId: string,
  role: 'OWNER' | 'ADMIN' | 'MEMBER',
) {
  return {
    groupId,
    userId,
    role,
    createdAt,
    updatedAt: createdAt,
  };
}

function group(id = 'group_1') {
  return {
    id,
    name: 'Product team',
    description: 'Launch planning',
    visibility: 'PRIVATE' as const,
    ownerId: 'user_owner',
    createdAt,
    updatedAt: createdAt,
  };
}

function createDeps(
  overrides: Partial<GroupUseCaseDeps> = {},
): GroupUseCaseDeps {
  return {
    findUserById: vi.fn().mockImplementation(async (userId: string) => {
      const users = new Map([
        ['user_owner', user('user_owner', 'Owner')],
        ['user_admin', user('user_admin', 'Admin')],
        ['user_member', user('user_member', 'Member')],
        ['user_invited', user('user_invited', 'Invited')],
      ]);
      return users.get(userId);
    }),
    createGroupWithOwner: vi.fn().mockResolvedValue(group()),
    listGroupsForUser: vi.fn().mockResolvedValue([]),
    listPendingInvitationsForUser: vi.fn().mockResolvedValue([]),
    findGroupById: vi.fn().mockResolvedValue(group()),
    findMembership: vi.fn().mockResolvedValue(undefined),
    listMembers: vi.fn().mockResolvedValue([
      {
        ...membership('group_1', 'user_owner', 'OWNER'),
        user: user('user_owner', 'Owner'),
      },
    ]),
    listPendingInvitations: vi.fn().mockResolvedValue([]),
    listMessages: vi.fn().mockResolvedValue([]),
    findMessageById: vi.fn().mockResolvedValue(undefined),
    findPendingInvitation: vi.fn().mockResolvedValue(undefined),
    findInvitationById: vi.fn().mockResolvedValue(undefined),
    createInvitation: vi.fn().mockResolvedValue({
      id: 'invitation_1',
      groupId: 'group_1',
      invitedUserId: 'user_invited',
      invitedByUserId: 'user_owner',
      status: 'pending',
      createdAt,
      respondedAt: null,
    }),
    createMessage: vi.fn().mockResolvedValue({
      id: 'message_1',
      groupId: 'group_1',
      senderUserId: 'user_member',
      body: 'Hello team',
      kind: 'text',
      metadata: {},
      pinnedAt: null,
      createdAt,
    }),
    updateMessage: vi.fn().mockResolvedValue(undefined),
    updateInvitationStatus: vi.fn().mockResolvedValue(undefined),
    addMember: vi.fn().mockResolvedValue(undefined),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn().mockResolvedValue(undefined),
    searchInviteCandidates: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('group use cases', () => {
  it('creates a group with the creator as owner', async () => {
    const deps = createDeps();

    const result = await createGroupUseCase(
      'user_owner',
      { name: ' Product team ', description: ' Launch planning ' },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      data: {
        id: 'group_1',
        name: 'Product team',
        description: 'Launch planning',
        visibility: 'PRIVATE',
        ownerId: 'user_owner',
        role: 'OWNER',
        memberCount: 1,
        pendingInvitationCount: 0,
      },
    });
    expect(deps.createGroupWithOwner).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'Product team',
      description: 'Launch planning',
      visibility: 'PRIVATE',
      ownerId: 'user_owner',
    });
  });

  it('shows public groups to admins as viewers', async () => {
    const deps = createDeps({
      listGroupsForUser: vi.fn().mockResolvedValue([
        {
          ...group('group_public'),
          visibility: 'PUBLIC',
          role: 'VIEWER',
          memberCount: 2,
          pendingInvitationCount: 0,
        },
      ]),
    });

    await expect(
      getGroupsPageDataUseCase('user_admin', 'ADMIN', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        groups: [
          {
            id: 'group_public',
            name: 'Product team',
            description: 'Launch planning',
            visibility: 'PUBLIC',
            ownerId: 'user_owner',
            role: 'VIEWER',
            memberCount: 2,
            pendingInvitationCount: 0,
          },
        ],
        invitations: [],
      },
    });
    expect(deps.listGroupsForUser).toHaveBeenCalledWith('user_admin', 'ADMIN');
  });

  it('lets superadmins view private group details without membership', async () => {
    const deps = createDeps({
      findMembership: vi.fn().mockResolvedValue(undefined),
      listMessages: vi.fn().mockResolvedValue([
        {
          id: 'message_1',
          groupId: 'group_1',
          senderUserId: 'user_owner',
          body: 'Kickoff at 10',
          kind: 'text',
          metadata: {},
          pinnedAt: null,
          createdAt,
          sender: user('user_owner', 'Owner'),
        },
      ]),
    });

    await expect(
      getGroupDetailUseCase('user_admin', 'SUPERADMIN', 'group_1', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        id: 'group_1',
        name: 'Product team',
        description: 'Launch planning',
        visibility: 'PRIVATE',
        ownerId: 'user_owner',
        role: 'VIEWER',
        memberCount: 1,
        pendingInvitationCount: 0,
        members: [
          {
            userId: 'user_owner',
            tag: 'user_owner',
            displayName: 'Owner',
            imageUrl: null,
            role: 'OWNER',
            joinedAt: createdAt.toISOString(),
          },
        ],
        pendingInvitations: [],
        messages: [
          {
            id: 'message_1',
            groupId: 'group_1',
            sender: {
              userId: 'user_owner',
              tag: 'user_owner',
              displayName: 'Owner',
              imageUrl: null,
            },
            body: 'Kickoff at 10',
            kind: 'text',
            metadata: {},
            pinnedAt: null,
            createdAt: createdAt.toISOString(),
          },
        ],
        canInvite: false,
        canManageMembers: false,
        canSendMessages: false,
      },
    });
  });

  it('allows owners and admins to invite non-members', async () => {
    const deps = createDeps({
      findMembership: vi
        .fn()
        .mockImplementation(async (_groupId: string, userId: string) => {
          if (userId === 'user_owner') {
            return membership('group_1', 'user_owner', 'OWNER');
          }

          return undefined;
        }),
    });

    const result = await inviteUserToGroupUseCase(
      'user_owner',
      'group_1',
      'user_invited',
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.createInvitation).toHaveBeenCalledWith({
      id: expect.any(String),
      groupId: 'group_1',
      invitedUserId: 'user_invited',
      invitedByUserId: 'user_owner',
    });
  });

  it('rejects invitations from regular members', async () => {
    const deps = createDeps({
      findMembership: vi
        .fn()
        .mockResolvedValue(membership('group_1', 'user_member', 'MEMBER')),
    });

    await expect(
      inviteUserToGroupUseCase('user_member', 'group_1', 'user_invited', deps),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only group admins can invite members.',
      },
    });
    expect(deps.createInvitation).not.toHaveBeenCalled();
  });

  it('accepts invitations by adding the invited user as a member', async () => {
    const deps = createDeps({
      findInvitationById: vi.fn().mockResolvedValue({
        id: 'invitation_1',
        groupId: 'group_1',
        invitedUserId: 'user_invited',
        invitedByUserId: 'user_owner',
        status: 'pending',
        createdAt,
        respondedAt: null,
        group: group(),
        inviter: user('user_owner', 'Owner'),
      }),
    });

    const result = await respondToGroupInvitationUseCase(
      'user_invited',
      'invitation_1',
      'accept',
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.addMember).toHaveBeenCalledWith(
      'group_1',
      'user_invited',
      'MEMBER',
    );
    expect(deps.updateInvitationStatus).toHaveBeenCalledWith(
      'invitation_1',
      'accepted',
    );
  });

  it('only lets the owner promote or demote admins', async () => {
    const deps = createDeps({
      findMembership: vi
        .fn()
        .mockImplementation(async (_groupId: string, userId: string) => {
          if (userId === 'user_owner') {
            return membership('group_1', 'user_owner', 'OWNER');
          }

          return membership('group_1', userId, 'MEMBER');
        }),
    });

    await expect(
      updateGroupMemberRoleUseCase(
        'user_owner',
        'group_1',
        'user_member',
        'ADMIN',
        deps,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        userId: 'user_member',
        role: 'ADMIN',
      },
    });
    expect(deps.updateMemberRole).toHaveBeenCalledWith(
      'group_1',
      'user_member',
      'ADMIN',
    );
  });

  it('prevents admins from removing other admins while allowing member removal', async () => {
    const deps = createDeps({
      findMembership: vi
        .fn()
        .mockImplementation(async (_groupId: string, userId: string) => {
          if (userId === 'user_admin') {
            return membership('group_1', 'user_admin', 'ADMIN');
          }

          return membership(
            'group_1',
            userId,
            userId === 'user_member' ? 'MEMBER' : 'ADMIN',
          );
        }),
    });

    await expect(
      removeGroupMemberUseCase('user_admin', 'group_1', 'user_invited', deps),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admins can only remove regular members.',
      },
    });

    await expect(
      removeGroupMemberUseCase('user_admin', 'group_1', 'user_member', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        removed: true,
        userId: 'user_member',
      },
    });
    expect(deps.removeMember).toHaveBeenCalledWith('group_1', 'user_member');
  });

  it('loads group messages only for group members', async () => {
    const deps = createDeps({
      findMembership: vi
        .fn()
        .mockResolvedValue(membership('group_1', 'user_member', 'MEMBER')),
      listMessages: vi.fn().mockResolvedValue([
        {
          id: 'message_1',
          groupId: 'group_1',
          senderUserId: 'user_owner',
          body: 'Kickoff at 10',
          kind: 'text',
          metadata: {},
          pinnedAt: null,
          createdAt,
          sender: user('user_owner', 'Owner'),
        },
      ]),
    });

    await expect(
      getGroupMessagesUseCase('user_member', 'group_1', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        messages: [
          {
            id: 'message_1',
            groupId: 'group_1',
            sender: {
              userId: 'user_owner',
              tag: 'user_owner',
              displayName: 'Owner',
              imageUrl: null,
            },
            body: 'Kickoff at 10',
            kind: 'text',
            metadata: {},
            pinnedAt: null,
            createdAt: createdAt.toISOString(),
          },
        ],
      },
    });
  });

  it('sends group messages for members', async () => {
    const deps = createDeps({
      findMembership: vi
        .fn()
        .mockResolvedValue(membership('group_1', 'user_member', 'MEMBER')),
    });

    const result = await sendGroupMessageUseCase(
      'user_member',
      'group_1',
      ' Hello team ',
      deps,
    );

    expect(result).toEqual({
      ok: true,
      data: {
        message: {
          id: 'message_1',
          groupId: 'group_1',
          sender: {
            userId: 'user_member',
            tag: 'user_member',
            displayName: 'Member',
            imageUrl: null,
          },
          body: 'Hello team',
          kind: 'text',
          metadata: {},
          pinnedAt: null,
          createdAt: createdAt.toISOString(),
        },
      },
    });
    expect(deps.createMessage).toHaveBeenCalledWith({
      id: expect.any(String),
      groupId: 'group_1',
      senderUserId: 'user_member',
      body: 'Hello team',
      kind: 'text',
      metadata: {},
      createdAt: expect.any(Date),
    });
  });

  it('lets group members vote in poll messages', async () => {
    const deps = createDeps({
      findMembership: vi
        .fn()
        .mockResolvedValue(membership('group_1', 'user_member', 'MEMBER')),
      findMessageById: vi.fn().mockResolvedValue({
        id: 'message_1',
        groupId: 'group_1',
        senderUserId: 'user_owner',
        body: 'Pick a day',
        kind: 'poll',
        metadata: {
          poll: {
            options: [
              { id: 'option_1', text: 'Monday', voterUserIds: [] },
              { id: 'option_2', text: 'Tuesday', voterUserIds: [] },
            ],
          },
        },
        pinnedAt: null,
        createdAt,
      }),
      updateMessage: vi.fn().mockResolvedValue({
        id: 'message_1',
        groupId: 'group_1',
        senderUserId: 'user_owner',
        body: 'Pick a day',
        kind: 'poll',
        metadata: {
          poll: {
            options: [
              {
                id: 'option_1',
                text: 'Monday',
                voterUserIds: ['user_member'],
              },
              { id: 'option_2', text: 'Tuesday', voterUserIds: [] },
            ],
          },
        },
        pinnedAt: null,
        createdAt,
      }),
    });

    const result = await updateGroupChatMessageUseCase(
      'user_member',
      {
        groupId: 'group_1',
        messageId: 'message_1',
        action: 'vote-poll',
        optionId: 'option_1',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.updateMessage).toHaveBeenCalledWith('message_1', {
      metadata: {
        poll: {
          options: [
            { id: 'option_1', text: 'Monday', voterUserIds: ['user_member'] },
            { id: 'option_2', text: 'Tuesday', voterUserIds: [] },
          ],
        },
      },
    });
  });

  it('rejects group messages from non-members', async () => {
    const deps = createDeps({
      findMembership: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      sendGroupMessageUseCase('user_member', 'group_1', 'Hello team', deps),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You are not a member of this group.',
      },
    });
    expect(deps.createMessage).not.toHaveBeenCalled();
  });
});
