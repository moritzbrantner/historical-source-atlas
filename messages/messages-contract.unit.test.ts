import { describe, expect, it } from 'vitest';

import deMessages from '@/messages/de';
import enMessages from '@/messages/en';
import esMessages from '@/messages/es';
import frMessages from '@/messages/fr';

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

describe('foundation message contract', () => {
  it('keeps supported locale catalogs shape-compatible', () => {
    const englishShape = collectShape(enMessages);

    for (const [locale, messages] of Object.entries(messagesByLocale)) {
      expect({ locale, shape: collectShape(messages) }).toEqual({
        locale,
        shape: englishShape,
      });
    }
  });
});
