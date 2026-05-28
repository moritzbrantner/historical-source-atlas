import { describe, expect, it, vi } from 'vitest';

import {
  blockUserUseCase,
  followUserUseCase,
  getProfileFollowerVisibilityUseCase,
  getProfileChatUseCase,
  getProfileViewByTagUseCase,
  getProfileViewUseCase,
  getProfileSearchVisibilityUseCase,
  listBlockedProfilesUseCase,
  listFriendProfilesUseCase,
  listProfileFollowersByTagUseCase,
  listProfileFollowingByTagUseCase,
  listFollowingProfilesUseCase,
  searchUsersToFollowUseCase,
  sendProfileMessageUseCase,
  unblockUserUseCase,
  unfollowUserUseCase,
  updateProfileFollowerVisibilityUseCase,
  updateProfileSearchVisibilityUseCase,
  updateProfileTagUseCase,
  type ProfileUseCaseDeps,
} from '@/src/domain/profile/use-cases';

function createDeps(
  overrides: Partial<ProfileUseCaseDeps> = {},
): ProfileUseCaseDeps {
  return {
    findUserById: vi.fn(),
    findUserByTag: vi.fn(),
    findUserByTagExcludingId: vi.fn(),
    countFollowers: vi.fn().mockResolvedValue(0),
    hasFollowRelationship: vi.fn().mockResolvedValue(false),
    createFollowRelationship: vi.fn().mockResolvedValue(undefined),
    deleteFollowRelationship: vi.fn().mockResolvedValue(undefined),
    deleteFollowRelationshipsBetweenUsers: vi.fn().mockResolvedValue(undefined),
    getBlockRelationshipState: vi.fn().mockResolvedValue({
      isBlockedByViewer: false,
      hasBlockedViewer: false,
    }),
    createBlockRelationship: vi.fn().mockResolvedValue(undefined),
    deleteBlockRelationship: vi.fn().mockResolvedValue(undefined),
    listFollowingUsers: vi.fn().mockResolvedValue([]),
    listFriendUsers: vi.fn().mockResolvedValue([]),
    listBlockedUsers: vi.fn().mockResolvedValue([]),
    listFollowersForUser: vi.fn().mockResolvedValue([]),
    listProfileMessagesBetweenUsers: vi.fn().mockResolvedValue([]),
    findProfileMessageById: vi.fn().mockResolvedValue(undefined),
    searchUsersToFollow: vi.fn().mockResolvedValue([]),
    updateUserSearchVisibility: vi.fn().mockResolvedValue(undefined),
    updateUserFollowerVisibility: vi.fn().mockResolvedValue(undefined),
    updateUserTag: vi.fn().mockResolvedValue(undefined),
    createProfileMessageNotification: vi.fn().mockResolvedValue({
      id: 'notification_1',
      userId: 'user_2',
      actorId: 'user_1',
      body: 'Hello there',
      kind: 'text',
      metadata: {},
      pinnedAt: null,
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
    }),
    updateProfileMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('profile follow use cases', () => {
  it('loads a profile view with follower count and follow state', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: 'local-profile-images/user_2/avatar.jpg',
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      countFollowers: vi.fn().mockResolvedValue(14),
      hasFollowRelationship: vi.fn().mockResolvedValue(true),
    });

    const result = await getProfileViewUseCase('user_2', 'user_1', deps);

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'user_2',
        tag: 'person',
        displayName: 'Person',
        imageUrl: '/local-profile-images/user_2/avatar.jpg',
        bannerImageUrl: null,
        followerCount: 14,
        isOwnProfile: false,
        isFollowing: true,
        isFriend: true,
        isBlockedByViewer: false,
      },
    });
  });

  it('does not query follow state for your own profile', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'person@example.com',
        tag: 'person',
        name: null,
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      countFollowers: vi.fn().mockResolvedValue(3),
    });

    const result = await getProfileViewUseCase('user_1', 'user_1', deps);

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'user_1',
        tag: 'person',
        displayName: 'person',
        imageUrl: null,
        bannerImageUrl: null,
        followerCount: 3,
        isOwnProfile: true,
        isFollowing: false,
        isFriend: false,
        isBlockedByViewer: false,
      },
    });
    expect(deps.hasFollowRelationship).not.toHaveBeenCalled();
  });

  it('blocks and unblocks a user while removing follow relationships in both directions', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
    });

    await expect(blockUserUseCase('user_1', 'user_2', deps)).resolves.toEqual({
      ok: true,
      data: {
        blocked: true,
      },
    });
    expect(deps.createBlockRelationship).toHaveBeenCalledWith(
      'user_1',
      'user_2',
    );
    expect(deps.deleteFollowRelationshipsBetweenUsers).toHaveBeenCalledWith(
      'user_1',
      'user_2',
    );

    await expect(unblockUserUseCase('user_1', 'user_2', deps)).resolves.toEqual(
      {
        ok: true,
        data: {
          blocked: false,
        },
      },
    );
    expect(deps.deleteBlockRelationship).toHaveBeenCalledWith(
      'user_1',
      'user_2',
    );
  });

  it('creates and removes follow relationships idempotently', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
    });

    await expect(followUserUseCase('user_1', 'user_2', deps)).resolves.toEqual({
      ok: true,
      data: {
        following: true,
        isFriend: false,
      },
    });
    expect(deps.createFollowRelationship).toHaveBeenCalledWith(
      'user_1',
      'user_2',
    );

    await expect(
      unfollowUserUseCase('user_1', 'user_2', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        following: false,
        isFriend: false,
      },
    });
    expect(deps.deleteFollowRelationship).toHaveBeenCalledWith(
      'user_1',
      'user_2',
    );
  });

  it('marks a follow mutation as a friend when the target already follows the actor', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      hasFollowRelationship: vi.fn().mockResolvedValue(true),
    });

    await expect(followUserUseCase('user_1', 'user_2', deps)).resolves.toEqual({
      ok: true,
      data: {
        following: true,
        isFriend: true,
      },
    });
    expect(deps.hasFollowRelationship).toHaveBeenCalledWith('user_2', 'user_1');
  });

  it('sends profile messages only between friends', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockImplementation((userId: string) =>
        Promise.resolve(
          userId === 'user_1'
            ? {
                id: 'user_1',
                email: 'sender@example.com',
                tag: 'sender',
                name: 'Sender',
                image: null,
                isSearchable: true,
                followerVisibility: 'PUBLIC',
              }
            : {
                id: 'user_2',
                email: 'target@example.com',
                tag: 'target',
                name: 'Target',
                image: null,
                isSearchable: true,
                followerVisibility: 'PUBLIC',
              },
        ),
      ),
      hasFollowRelationship: vi.fn().mockResolvedValue(true),
    });

    await expect(
      sendProfileMessageUseCase('user_1', 'user_2', '  Hello there  ', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        message: {
          id: 'notification_1',
          senderUserId: 'user_1',
          body: 'Hello there',
          kind: 'text',
          metadata: {},
          pinnedAt: null,
          createdAt: '2026-05-02T10:00:00.000Z',
        },
      },
    });
    expect(deps.createProfileMessageNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        senderUserId: 'user_1',
        targetUserId: 'user_2',
        title: 'Sender sent you a message',
        body: 'Hello there',
        kind: 'text',
        metadata: {},
        href: '/chat/user_1',
      }),
    );
  });

  it('rejects profile messages when the users are not friends', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      hasFollowRelationship: vi
        .fn()
        .mockImplementation((followerId: string, followingId: string) =>
          Promise.resolve(followerId === 'user_1' && followingId === 'user_2'),
        ),
    });

    await expect(
      sendProfileMessageUseCase('user_1', 'user_2', 'Hello', deps),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only message friends.',
      },
    });
    expect(deps.createProfileMessageNotification).not.toHaveBeenCalled();
  });

  it('loads a chat with a friend from direct profile messages', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockImplementation((userId: string) =>
        Promise.resolve(
          userId === 'user_1'
            ? {
                id: 'user_1',
                email: 'sender@example.com',
                tag: 'sender',
                name: 'Sender',
                image: null,
                bannerImage: null,
                isSearchable: true,
                followerVisibility: 'PUBLIC',
              }
            : {
                id: 'user_2',
                email: 'target@example.com',
                tag: 'target',
                name: 'Target',
                image: null,
                bannerImage: null,
                isSearchable: true,
                followerVisibility: 'PUBLIC',
              },
        ),
      ),
      hasFollowRelationship: vi.fn().mockResolvedValue(true),
      listProfileMessagesBetweenUsers: vi.fn().mockResolvedValue([
        {
          id: 'message_1',
          actorId: 'user_2',
          body: 'Hello',
          kind: 'text',
          metadata: {},
          pinnedAt: null,
          createdAt: new Date('2026-05-02T10:00:00.000Z'),
        },
      ]),
    });

    await expect(
      getProfileChatUseCase('user_1', 'user_2', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        member: {
          userId: 'user_2',
          tag: 'target',
          displayName: 'Target',
          imageUrl: null,
        },
        messages: [
          {
            id: 'message_1',
            senderUserId: 'user_2',
            body: 'Hello',
            kind: 'text',
            metadata: {},
            pinnedAt: null,
            createdAt: '2026-05-02T10:00:00.000Z',
          },
        ],
      },
    });
  });

  it('rejects follow attempts when the actor has already blocked the target', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      getBlockRelationshipState: vi.fn().mockResolvedValue({
        isBlockedByViewer: true,
        hasBlockedViewer: false,
      }),
    });

    await expect(followUserUseCase('user_1', 'user_2', deps)).resolves.toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Unblock this user before following them.',
      },
    });
    expect(deps.createFollowRelationship).not.toHaveBeenCalled();
  });

  it('rejects profile access when the target user has blocked the viewer', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      getBlockRelationshipState: vi.fn().mockResolvedValue({
        isBlockedByViewer: false,
        hasBlockedViewer: true,
      }),
    });

    await expect(
      getProfileViewUseCase('user_2', 'user_1', deps),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You cannot view this profile.',
      },
    });
    expect(deps.countFollowers).not.toHaveBeenCalled();
  });

  it('rejects attempts to follow yourself', async () => {
    const deps = createDeps();

    await expect(followUserUseCase('user_1', 'user_1', deps)).resolves.toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'You cannot follow your own profile.',
      },
    });

    expect(deps.findUserById).not.toHaveBeenCalled();
    expect(deps.createFollowRelationship).not.toHaveBeenCalled();
  });

  it('lists the profiles a user already follows', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      listFollowingUsers: vi.fn().mockResolvedValue([
        {
          id: 'user_2',
          email: 'alpha@example.com',
          tag: 'alpha',
          name: 'Alpha',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
        },
        {
          id: 'user_3',
          email: 'bravo@example.com',
          tag: 'bravo',
          name: null,
          image: 'local-profile-images/user_3/avatar.jpg',
          isSearchable: false,
          followerVisibility: 'PRIVATE',
        },
      ]),
    });

    const result = await listFollowingProfilesUseCase('user_1', deps);

    expect(result).toEqual({
      ok: true,
      data: {
        profiles: [
          {
            userId: 'user_2',
            tag: 'alpha',
            displayName: 'Alpha',
            imageUrl: null,
          },
          {
            userId: 'user_3',
            tag: 'bravo',
            displayName: 'bravo',
            imageUrl: '/local-profile-images/user_3/avatar.jpg',
          },
        ],
      },
    });
  });

  it('lists friends as profiles with mutual follow relationships', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      listFriendUsers: vi.fn().mockResolvedValue([
        {
          id: 'user_2',
          email: 'alpha@example.com',
          tag: 'alpha',
          name: 'Alpha',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
        },
        {
          id: 'user_3',
          email: 'bravo@example.com',
          tag: 'bravo',
          name: null,
          image: 'local-profile-images/user_3/avatar.jpg',
          isSearchable: true,
          followerVisibility: 'MEMBERS',
        },
      ]),
    });

    const result = await listFriendProfilesUseCase('user_1', deps);

    expect(result).toEqual({
      ok: true,
      data: {
        profiles: [
          {
            userId: 'user_2',
            tag: 'alpha',
            displayName: 'Alpha',
            imageUrl: null,
          },
          {
            userId: 'user_3',
            tag: 'bravo',
            displayName: 'bravo',
            imageUrl: '/local-profile-images/user_3/avatar.jpg',
          },
        ],
      },
    });
  });

  it('lists the profiles a user has blocked', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      listBlockedUsers: vi.fn().mockResolvedValue([
        {
          id: 'user_2',
          email: 'alpha@example.com',
          tag: 'alpha',
          name: 'Alpha',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
        },
      ]),
    });

    await expect(listBlockedProfilesUseCase('user_1', deps)).resolves.toEqual({
      ok: true,
      data: {
        profiles: [
          {
            userId: 'user_2',
            tag: 'alpha',
            displayName: 'Alpha',
            imageUrl: null,
          },
        ],
      },
    });
  });

  it('searches discoverable users to follow', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      searchUsersToFollow: vi.fn().mockResolvedValue([
        {
          id: 'user_4',
          email: 'casey@example.com',
          tag: 'casey',
          name: 'Casey',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
        },
      ]),
    });

    const result = await searchUsersToFollowUseCase('user_1', 'case', deps);

    expect(result).toEqual({
      ok: true,
      data: {
        profiles: [
          {
            userId: 'user_4',
            tag: 'casey',
            displayName: 'Casey',
            imageUrl: null,
            followerCount: 0,
            isFollowing: false,
            followsViewer: false,
            isFriend: false,
          },
        ],
      },
    });
    expect(deps.searchUsersToFollow).toHaveBeenCalledWith('user_1', 'case');
  });

  it('loads prioritized people recommendations when search is empty', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      searchUsersToFollow: vi.fn().mockResolvedValue([
        {
          id: 'user_2',
          email: 'friend@example.com',
          tag: 'friend',
          name: 'Friend',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
          followerCount: 12,
          isFollowing: true,
          followsViewer: true,
        },
        {
          id: 'user_3',
          email: 'follower@example.com',
          tag: 'follower',
          name: 'Follower',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
          followerCount: 8,
          isFollowing: false,
          followsViewer: true,
        },
      ]),
    });

    const result = await searchUsersToFollowUseCase('user_1', '', deps);

    expect(result).toEqual({
      ok: true,
      data: {
        profiles: [
          {
            userId: 'user_2',
            tag: 'friend',
            displayName: 'Friend',
            imageUrl: null,
            followerCount: 12,
            isFollowing: true,
            followsViewer: true,
            isFriend: true,
          },
          {
            userId: 'user_3',
            tag: 'follower',
            displayName: 'Follower',
            imageUrl: null,
            followerCount: 8,
            isFollowing: false,
            followsViewer: true,
            isFriend: false,
          },
        ],
      },
    });
    expect(deps.searchUsersToFollow).toHaveBeenCalledWith('user_1', '');
  });

  it('reads and updates whether a profile can be searched', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: false,
        followerVisibility: 'MEMBERS',
      }),
    });

    await expect(
      getProfileSearchVisibilityUseCase('user_1', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        isSearchable: false,
      },
    });

    await expect(
      updateProfileSearchVisibilityUseCase('user_1', true, deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        isSearchable: true,
      },
    });
    expect(deps.updateUserSearchVisibility).toHaveBeenCalledWith(
      'user_1',
      true,
    );

    await expect(
      getProfileFollowerVisibilityUseCase('user_1', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        followerVisibility: 'MEMBERS',
      },
    });

    await expect(
      updateProfileFollowerVisibilityUseCase('user_1', 'PRIVATE', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        followerVisibility: 'PRIVATE',
      },
    });
    expect(deps.updateUserFollowerVisibility).toHaveBeenCalledWith(
      'user_1',
      'PRIVATE',
    );
  });

  it('filters followers by their visibility role', async () => {
    const deps = createDeps({
      findUserByTag: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'owner@example.com',
        tag: 'owner',
        name: 'Owner',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      listFollowersForUser: vi.fn().mockResolvedValue([
        {
          id: 'user_2',
          email: 'public@example.com',
          tag: 'public-person',
          name: 'Public Person',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
        },
        {
          id: 'user_3',
          email: 'member@example.com',
          tag: 'member-person',
          name: 'Member Person',
          image: null,
          isSearchable: true,
          followerVisibility: 'MEMBERS',
        },
        {
          id: 'user_4',
          email: 'private@example.com',
          tag: 'private-person',
          name: 'Private Person',
          image: null,
          isSearchable: false,
          followerVisibility: 'PRIVATE',
        },
      ]),
    });

    await expect(
      listProfileFollowersByTagUseCase('owner', null, deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        profile: {
          userId: 'user_1',
          tag: 'owner',
          displayName: 'Owner',
        },
        followers: [
          {
            userId: 'user_2',
            tag: 'public-person',
            displayName: 'Public Person',
            imageUrl: null,
            visibilityRole: 'PUBLIC',
          },
        ],
        totalFollowerCount: 3,
        hiddenFollowerCount: 2,
        isOwnProfile: false,
      },
    });

    await expect(
      listProfileFollowersByTagUseCase('owner', 'user_9', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        profile: {
          userId: 'user_1',
          tag: 'owner',
          displayName: 'Owner',
        },
        followers: [
          {
            userId: 'user_2',
            tag: 'public-person',
            displayName: 'Public Person',
            imageUrl: null,
            visibilityRole: 'PUBLIC',
          },
          {
            userId: 'user_3',
            tag: 'member-person',
            displayName: 'Member Person',
            imageUrl: null,
            visibilityRole: 'MEMBERS',
          },
        ],
        totalFollowerCount: 3,
        hiddenFollowerCount: 1,
        isOwnProfile: false,
      },
    });

    await expect(
      listProfileFollowersByTagUseCase('owner', 'user_1', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        profile: {
          userId: 'user_1',
          tag: 'owner',
          displayName: 'Owner',
        },
        followers: [
          {
            userId: 'user_2',
            tag: 'public-person',
            displayName: 'Public Person',
            imageUrl: null,
            visibilityRole: 'PUBLIC',
          },
          {
            userId: 'user_3',
            tag: 'member-person',
            displayName: 'Member Person',
            imageUrl: null,
            visibilityRole: 'MEMBERS',
          },
          {
            userId: 'user_4',
            tag: 'private-person',
            displayName: 'Private Person',
            imageUrl: null,
            visibilityRole: 'PRIVATE',
          },
        ],
        totalFollowerCount: 3,
        hiddenFollowerCount: 0,
        isOwnProfile: true,
      },
    });
  });

  it('lists the profiles a tagged user follows', async () => {
    const deps = createDeps({
      findUserByTag: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'owner@example.com',
        tag: 'owner',
        name: 'Owner',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      listFollowingUsers: vi.fn().mockResolvedValue([
        {
          id: 'user_2',
          email: 'alpha@example.com',
          tag: 'alpha-person',
          name: 'Alpha Person',
          image: null,
          isSearchable: true,
          followerVisibility: 'PUBLIC',
        },
        {
          id: 'user_3',
          email: 'bravo@example.com',
          tag: 'bravo-person',
          name: null,
          image: 'local-profile-images/user_3/avatar.jpg',
          isSearchable: false,
          followerVisibility: 'PRIVATE',
        },
      ]),
    });

    await expect(
      listProfileFollowingByTagUseCase('owner', 'user_9', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        profile: {
          userId: 'user_1',
          tag: 'owner',
          displayName: 'Owner',
        },
        following: [
          {
            userId: 'user_2',
            tag: 'alpha-person',
            displayName: 'Alpha Person',
            imageUrl: null,
          },
          {
            userId: 'user_3',
            tag: 'bravo-person',
            displayName: 'bravo',
            imageUrl: '/local-profile-images/user_3/avatar.jpg',
          },
        ],
        totalFollowingCount: 2,
        isOwnProfile: false,
      },
    });
    expect(deps.getBlockRelationshipState).toHaveBeenCalledWith(
      'user_9',
      'user_1',
    );
    expect(deps.listFollowingUsers).toHaveBeenCalledWith('user_1');
  });

  it('loads a public profile by tag', async () => {
    const deps = createDeps({
      findUserByTag: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'person',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      countFollowers: vi.fn().mockResolvedValue(2),
    });

    await expect(
      getProfileViewByTagUseCase('person', null, deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        userId: 'user_2',
        tag: 'person',
        displayName: 'Person',
        imageUrl: null,
        bannerImageUrl: null,
        followerCount: 2,
        isOwnProfile: false,
        isFollowing: false,
        isFriend: false,
        isBlockedByViewer: false,
      },
    });
  });

  it('updates a profile tag when it is available', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      findUserByTagExcludingId: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      updateProfileTagUseCase('user_1', '@new-handle', deps),
    ).resolves.toEqual({
      ok: true,
      data: {
        tag: 'new-handle',
      },
    });
    expect(deps.updateUserTag).toHaveBeenCalledWith('user_1', 'new-handle');
  });

  it('rejects profile tags that are already taken', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'viewer@example.com',
        tag: 'viewer',
        name: 'Viewer',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
      findUserByTagExcludingId: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'person@example.com',
        tag: 'new-handle',
        name: 'Person',
        image: null,
        isSearchable: true,
        followerVisibility: 'PUBLIC',
      }),
    });

    await expect(
      updateProfileTagUseCase('user_1', 'new-handle', deps),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'That tag is already taken.',
      },
    });
  });
});
