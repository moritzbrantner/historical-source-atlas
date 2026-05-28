import { adminPage } from '../en/admin-page';
import { blogPage } from '../en/blog-page';
import { authPages } from '../en/auth-pages';
import { dataEntryPage } from '../en/data-entry-page';
import { groupsPage } from '../en/groups-page';
import { notificationsPage } from '../en/notifications-page';
import { peoplePage } from '../en/people-page';
import { profileChatPage } from '../en/profile-chat-page';
import { profilePage } from '../en/profile-page';
import { reportProblemPage } from '../en/report-problem-page';
import { settingsPage } from '../en/settings-page';
import { themeToggle } from '../en/theme-toggle';
import { unlighthousePage } from '../en/unlighthouse-page';
import { navigationBar } from './navigation-bar';

const esMessages = {
  NavigationBar: navigationBar,
  AuthPages: authPages,
  LanguageSelector: {
    label: 'Selector de idioma',
    locales: {
      en: 'EN',
      de: 'DE',
      fr: 'FR',
      es: 'ES',
    },
  },
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

export default esMessages;
