import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  foundationFeatureKeys,
  resolvePublicRoute,
  withLocalePath,
  type AppManifest,
} from '@moritzbrantner/app-pack';
import { StaticRedirectPage } from '@moritzbrantner/app-pack-react';
import { Card, buttonVariants } from '@moritzbrantner/ui';

const manifest: AppManifest = {
  id: 'export-check',
  siteName: 'Export Check',
  defaultLocaleMetadata: {
    title: 'Export Check',
    description: 'Workspace package export checks',
  },
  enabledFeatures: {},
  publicPages: [
    {
      id: 'home',
      slug: '',
      kind: 'component',
      namespace: 'HomePage',
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

describe('workspace package exports', () => {
  it.each([
    'packages/app-pack/package.json',
    'packages/app-pack-react/package.json',
  ])('publishes the built dist entrypoint for %s', (packageJsonPath) => {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), packageJsonPath), 'utf8'),
    ) as {
      files: string[];
      main: string;
      types: string;
      exports: { '.': { import: string; types: string } };
    };

    expect(packageJson.files).toEqual(['dist']);
    expect(packageJson.main).toBe('./dist/index.js');
    expect(packageJson.types).toBe('./dist/index.d.ts');
    expect(packageJson.exports['.']).toEqual({
      import: './dist/index.js',
      types: './dist/index.d.ts',
    });
  });

  it('exposes the app-pack contract surface', () => {
    expect(foundationFeatureKeys.length).toBeGreaterThan(0);
    expect(withLocalePath('/about', 'de')).toBe('/de/about');
    expect(resolvePublicRoute(manifest, [])?.page.id).toBe('home');
  });

  it('exposes the app-pack React surface', () => {
    expect(StaticRedirectPage).toBeTypeOf('function');
  });

  it('exposes the UI surface used by app packs', () => {
    expect(Card).toBeDefined();
    expect(buttonVariants({ variant: 'ghost' })).toContain('inline-flex');
  });
});
