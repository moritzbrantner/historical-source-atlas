import type { AppLocale } from '@moritzbrantner/app-pack';

import deMessages from './de';
import enMessages from './en';
import esMessages from './es';
import frMessages from './fr';

const showcaseMessagesByLocale = {
  en: enMessages,
  de: deMessages,
  fr: frMessages,
  es: esMessages,
} as const;

export function loadShowcaseMessages(locale: AppLocale) {
  if (locale in showcaseMessagesByLocale) {
    return showcaseMessagesByLocale[
      locale as keyof typeof showcaseMessagesByLocale
    ];
  }

  return showcaseMessagesByLocale.en;
}
