export const shellNamespaces = [
  'NavigationBar',
  'LanguageSelector',
  'ThemeToggle',
] as const;

export const publicWebsiteNamespaces = [
  ...shellNamespaces,
  'PeoplePage',
  'ReportProblemPage',
] as const;

export const guestWebsiteNamespaces = [...shellNamespaces] as const;

export const protectedWebsiteNamespaces = [
  ...shellNamespaces,
  'GroupsPage',
  'NotificationsPage',
  'PeoplePage',
  'ProfileChatPage',
  'SettingsPage',
] as const;

export const adminWebsiteNamespaces = [
  ...shellNamespaces,
  'AdminPage',
] as const;
