import { bench, describe } from 'vitest';

import type { AppManifest } from '@/src/app-config/contracts';
import {
  generatePublicRouteParams,
  getPublicPageNamespaces,
  resolveEnabledPublicRoute,
} from '@/src/app-config/public-route-resolver';

const manifest: AppManifest = {
  id: 'bench-app',
  siteName: 'Benchmark App',
  defaultLocaleMetadata: {
    title: 'Benchmark App',
    description: 'Benchmark fixture',
  },
  enabledFeatures: {
    'showcase.forms': true,
    'showcase.communication': true,
  },
  publicPages: [
    {
      id: 'home',
      slug: '',
      kind: 'component',
      namespace: 'HomePage',
      render: () => null,
    },
    {
      id: 'about',
      slug: 'about',
      kind: 'component',
      namespace: 'AboutPage',
      render: () => null,
    },
    {
      id: 'forms',
      slug: 'examples/forms',
      aliases: ['forms'],
      kind: 'component',
      featureKey: 'showcase.forms',
      namespace: 'FormsPage',
      render: () => null,
    },
    {
      id: 'communication',
      slug: 'examples/communication',
      aliases: ['communication'],
      kind: 'component',
      featureKey: 'showcase.communication',
      namespace: 'CommunicationPage',
      render: () => null,
    },
  ],
  publicNavigation: [],
  contentRoots: {
    pages: [],
    blog: [],
    changelog: [],
  },
  loadMessages: () => ({}),
  exampleApis: {},
};
const routeSlugs = [
  undefined,
  'about',
  ['examples', 'forms'],
  'forms',
  ['examples', 'communication'],
  'missing-route',
] as const;
const locales = ['en', 'de', 'fr', 'es'];

describe('public route resolver', () => {
  bench('resolve enabled routes', () => {
    for (const slug of routeSlugs) {
      resolveEnabledPublicRoute(manifest, slug);
    }
  });

  bench('generate localized route params', () => {
    generatePublicRouteParams(locales, manifest);
  });

  bench('collect public page namespaces', () => {
    getPublicPageNamespaces(manifest);
  });
});
