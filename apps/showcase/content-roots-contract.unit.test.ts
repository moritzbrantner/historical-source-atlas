import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import showcaseManifest from '@/apps/showcase/manifest';

const supportedLocales = ['en', 'de', 'fr', 'es'] as const;

describe('showcase content roots contract', () => {
  it('points every configured content root at real locale directories', () => {
    for (const roots of Object.values(showcaseManifest.contentRoots)) {
      for (const root of roots) {
        const absoluteRoot = path.join(process.cwd(), root);
        expect(existsSync(absoluteRoot)).toBe(true);

        for (const locale of supportedLocales) {
          const localeRoot = path.join(absoluteRoot, locale);
          expect(existsSync(localeRoot)).toBe(true);
          expect(
            readdirSync(localeRoot).some((fileName) =>
              fileName.endsWith('.mdx'),
            ),
          ).toBe(true);
        }
      }
    }
  });
});
