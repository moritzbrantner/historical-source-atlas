import { createElement } from 'react';

import type { AppManifest } from '@moritzbrantner/app-pack';

import { loadShowcaseMessages } from './messages';

const enabledFeatures = {
  'account.register': true,
  'account.passwordRecovery': true,
  'profiles.public': true,
  'profiles.follow': true,
  'profiles.blog': true,
  'people.directory': true,
  groups: true,
  notifications: true,
  newsletter: true,
  reportProblem: true,
  'content.blog': true,
  'content.changelog': true,
  'workspace.dataEntry': true,
  'admin.workspace': true,
  'admin.content': true,
  'admin.reports': true,
  'admin.users': true,
  'admin.systemSettings': true,
  'admin.dataStudio': true,
  'showcase.forms': true,
  'showcase.communication': true,
  'showcase.remocn': true,
  'showcase.employeeTable': true,
  'showcase.chat': true,
  'showcase.uploads': true,
} as const;

const showcaseManifest: AppManifest = {
  id: 'showcase',
  siteName: 'Next Template',
  defaultLocaleMetadata: {
    title: 'Next Template',
    description:
      'Next.js application with auth, admin examples, and Drizzle/Postgres persistence.',
  },
  enabledFeatures,
  publicPages: [
    {
      id: 'home',
      slug: '',
      kind: 'component',
      namespace: 'HomePage',
      render: async ({ locale }) => {
        const pageModule = await import('./pages/home-page');
        const HomePage = pageModule.default;
        return createElement(HomePage, { locale });
      },
    },
    {
      id: 'about',
      slug: 'about',
      kind: 'component',
      namespace: 'AboutPage',
      render: async ({ locale }) => {
        const pageModule = await import('./pages/about-page');
        const AboutPage = pageModule.default;
        return createElement(AboutPage, { locale });
      },
    },
    {
      id: 'forms',
      slug: 'examples/forms',
      kind: 'component',
      namespace: 'FormsPage',
      featureKey: 'showcase.forms',
      aliases: ['forms'],
      render: async ({ locale }) => {
        const pageModule = await import('./pages/examples/forms-page');
        const FormsPage = pageModule.default;
        return createElement(FormsPage, { locale });
      },
    },
    {
      id: 'communication',
      slug: 'examples/communication',
      kind: 'component',
      namespace: 'CommunicationPage',
      featureKey: 'showcase.communication',
      aliases: ['communication'],
      render: async ({ locale }) => {
        const pageModule = await import('./pages/examples/communication-page');
        const CommunicationPage = pageModule.default;
        return createElement(CommunicationPage, { locale });
      },
    },
    {
      id: 'chat',
      slug: 'examples/chat',
      kind: 'component',
      namespace: 'ChatPage',
      featureKey: 'showcase.chat',
      aliases: ['chat'],
      render: async ({ locale }) => {
        const pageModule = await import('./pages/examples/chat-page');
        const ChatPage = pageModule.default;
        return createElement(ChatPage, { locale });
      },
    },
    {
      id: 'uploads',
      slug: 'examples/uploads',
      kind: 'component',
      namespace: 'UploadsPage',
      featureKey: 'showcase.uploads',
      aliases: ['uploads'],
      render: async ({ locale }) => {
        const pageModule = await import('./pages/examples/uploads-page');
        const UploadsPage = pageModule.default;
        return createElement(UploadsPage, { locale });
      },
    },
    {
      id: 'remocn',
      slug: 'examples/remocn',
      kind: 'component',
      namespace: 'RemocnPage',
      featureKey: 'showcase.remocn',
      aliases: ['remocn'],
      render: async ({ locale }) => {
        const pageModule = await import('./pages/remocn-page');
        const RemocnPage = pageModule.default;
        return createElement(RemocnPage, { locale });
      },
    },
    {
      id: 'table',
      slug: 'examples/table',
      kind: 'component',
      namespace: 'TablePage',
      featureKey: 'showcase.employeeTable',
      aliases: ['table'],
      render: async ({ locale }) => {
        const pageModule = await import('./pages/table-page');
        const TablePage = pageModule.default;
        return createElement(TablePage, { locale });
      },
    },
  ],
  publicNavigation: [
    { pageId: 'home', category: 'discover', hotkey: ['alt', 'h'], order: 10 },
    { pageId: 'about', category: 'discover', hotkey: ['alt', 'a'], order: 20 },
    { pageId: 'forms', category: 'discover', hotkey: ['alt', 'f'], order: 30 },
    {
      pageId: 'communication',
      category: 'discover',
      hotkey: ['alt', 'q'],
      order: 40,
    },
    { pageId: 'chat', category: 'discover', hotkey: ['alt', 'x'], order: 50 },
    {
      pageId: 'uploads',
      category: 'discover',
      hotkey: ['alt', 'z'],
      order: 60,
    },
    { pageId: 'remocn', category: 'discover', hotkey: ['alt', 'w'], order: 70 },
    { pageId: 'table', category: 'discover', hotkey: ['alt', '0'], order: 80 },
  ],
  contentRoots: {
    pages: ['apps/showcase/content/pages'],
    blog: ['apps/showcase/content/blog'],
    changelog: ['apps/showcase/content/changelog'],
  },
  loadMessages: loadShowcaseMessages,
  exampleApis: {
    employees: {
      featureKey: 'showcase.employeeTable',
      loadRouteModule: () => import('./api/examples/employees'),
    },
  },
};

export default showcaseManifest;
