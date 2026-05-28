import type { AuthProvider } from '@/src/auth';
import { buttonVariants } from '@/components/ui/button';
import type { AppLocale } from '@/i18n/routing';

const socialProviders = [
  'google',
  'facebook',
  'x',
] as const satisfies readonly AuthProvider[];

type SocialAuthButtonsProps = {
  locale: AppLocale;
  returnTo: '/login' | '/register';
  errorMessage?: string | null;
  labels: {
    divider: string;
    providers: Record<AuthProvider, string>;
  };
};

function buildSocialAuthHref(
  provider: AuthProvider,
  locale: AppLocale,
  returnTo: '/login' | '/register',
) {
  const searchParams = new URLSearchParams({
    locale,
    returnTo,
  });

  return `/api/auth/oauth/${provider}/start?${searchParams.toString()}`;
}

export function SocialAuthButtons({
  locale,
  returnTo,
  errorMessage,
  labels,
}: SocialAuthButtonsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {socialProviders.map((provider) => (
          <a
            key={provider}
            href={buildSocialAuthHref(provider, locale, returnTo)}
            className={buttonVariants({
              variant: 'outline',
              className: 'h-11 w-full justify-start gap-3 rounded-2xl px-4',
            })}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 text-xs font-semibold uppercase dark:border-zinc-700">
              {provider === 'facebook'
                ? 'f'
                : provider === 'google'
                  ? 'G'
                  : 'X'}
            </span>
            <span>{labels.providers[provider]}</span>
          </a>
        ))}
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
          {labels.divider}
        </p>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
