import { describe, expect, it } from 'vitest';

import deMessages from '@/apps/showcase/messages/de';
import enMessages from '@/apps/showcase/messages/en';
import esMessages from '@/apps/showcase/messages/es';
import frMessages from '@/apps/showcase/messages/fr';
import showcaseManifest from '@/apps/showcase/manifest';

const expectedNamespaces = new Set(
  showcaseManifest.publicPages.map((page) => page.namespace),
);
const supportedLocales = ['en', 'de', 'fr', 'es'] as const;
const messagesByLocale = {
  en: enMessages,
  de: deMessages,
  fr: frMessages,
  es: esMessages,
} as const;

function collectShape(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }

  return Object.keys(value)
    .sort()
    .flatMap((key) =>
      collectShape(
        (value as Record<string, unknown>)[key],
        prefix ? `${prefix}.${key}` : key,
      ),
    );
}

describe('showcase message contract', () => {
  it('covers every public page namespace in every supported locale', () => {
    const englishNamespaces = new Set(Object.keys(enMessages));

    for (const locale of supportedLocales) {
      const localeMessages = messagesByLocale[locale];
      const localeNamespaces = new Set(Object.keys(localeMessages));
      const missingNamespaces = Array.from(expectedNamespaces).filter(
        (namespace) => !localeNamespaces.has(namespace),
      );

      expect(localeNamespaces).toEqual(englishNamespaces);
      expect(missingNamespaces).toEqual([]);
      expect(collectShape(localeMessages)).toEqual(collectShape(enMessages));
    }
  });
});
