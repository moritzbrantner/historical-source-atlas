export const CONSENT_COOKIE_NAME = 'site-consent';

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export const defaultConsentState: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function serializeConsentState(state: ConsentState) {
  return JSON.stringify(state);
}

export function parseConsentCookie(value?: string | null): ConsentState {
  if (!value) {
    return defaultConsentState;
  }

  let decodedValue = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed = JSON.parse(decodedValue) as Partial<ConsentState>;

      return {
        necessary: true,
        analytics: parsed.analytics === true,
        marketing: parsed.marketing === true,
      };
    } catch {
      try {
        const nextValue = decodeURIComponent(decodedValue);

        if (nextValue === decodedValue) {
          break;
        }

        decodedValue = nextValue;
      } catch {
        break;
      }
    }
  }

  return defaultConsentState;
}
