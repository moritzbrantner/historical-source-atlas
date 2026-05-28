import { adminPage } from './admin-page';
import { blogPage } from './blog-page';
import { authPages } from './auth-pages';
import { dataEntryPage } from './data-entry-page';
import { groupsPage } from './groups-page';
import { languageSelector } from './language-selector';
import { navigationBar } from './navigation-bar';
import { notificationsPage } from './notifications-page';
import { peoplePage } from './people-page';
import { profileChatPage } from './profile-chat-page';
import { profilePage } from './profile-page';
import { reportProblemPage } from './report-problem-page';
import { settingsPage } from './settings-page';
import { themeToggle } from './theme-toggle';
import { unlighthousePage } from './unlighthouse-page';

const enMessages = {
  NavigationBar: navigationBar,
  AuthPages: authPages,
  LanguageSelector: languageSelector,
  ThemeToggle: themeToggle,
  AdminPage: adminPage,
  BlogPage: blogPage,
  DataEntryPage: dataEntryPage,
  GroupsPage: groupsPage,
  NotificationsPage: notificationsPage,
  PeoplePage: peoplePage,
  ProfileChatPage: profileChatPage,
  ProfilePage: profilePage,
  ReportProblemPage: reportProblemPage,
  SettingsPage: settingsPage,
  UnlighthousePage: unlighthousePage,
};

export default enMessages;
