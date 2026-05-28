export const peoplePage = {
  title: 'Friends',
  description: 'Manage mutual follows and add new friends from search.',
  search: {
    title: 'Find people',
    description: 'Search by name or browse recommended profiles.',
    placeholder: 'Search by name',
    close: 'Close friend search',
    loading: 'Searching…',
    idle: 'No recommended people are available right now.',
    empty: 'No discoverable users matched your search.',
    error: 'Unable to search for profiles right now. Please try again.',
    badges: {
      friend: 'Friend',
      followsYou: 'Follows you',
      popular: '{count} followers',
    },
  },
  following: {
    title: 'Following',
    description: 'You are currently following {count} people.',
    empty: 'You are not following anyone yet.',
  },
  friends: {
    title: 'Friends',
    description: 'You have {count} mutual follows.',
    empty: 'You do not have any friends yet. Add someone who follows you back.',
  },
  actions: {
    addFriend: 'Find people',
    follow: 'Follow',
    unfollow: 'Unfollow',
    following: 'Following…',
    unfollowing: 'Unfollowing…',
    block: 'Block',
    blocking: 'Blocking…',
    friendAdded: '{name} is now a friend.',
    followAdded:
      'You are following {name}. They will appear here when they follow you back.',
    error: 'Unable to update follow status right now. Please try again.',
    blockError: 'Unable to update block status right now. Please try again.',
  },
};
