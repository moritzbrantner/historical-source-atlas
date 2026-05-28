import { LoginForm } from '@/components/auth/login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { resolveOAuthPageError } from '@/src/auth/oauth/page-state';
import { createTranslator } from '@/src/i18n/messages';
import { requireGuest, resolveLocale } from '@/src/server/page-guards';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await requireGuest(locale);
  const t = createTranslator(locale, 'AuthPages.login');
  const oauthErrorState = resolveOAuthPageError(
    searchParams ? await searchParams : undefined,
  );
  const oauthErrorMessage = oauthErrorState
    ? t(`form.socialErrors.${oauthErrorState.error}`, {
        provider: t(`form.social.providers.${oauthErrorState.provider}`),
      })
    : null;

  return (
    <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
          {t('eyebrow')}
        </p>
        <div className="space-y-4">
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {t('heroTitle')}
          </h1>
          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {t('heroDescription')}
          </p>
        </div>
      </section>

      <Card className="border-zinc-200/80 shadow-xl shadow-zinc-950/5 dark:border-zinc-800/80 dark:shadow-black/20">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            locale={locale}
            oauthErrorMessage={oauthErrorMessage}
            returnTo="/login"
            labels={{
              email: t('form.email'),
              password: t('form.password'),
              otpCode: t('form.otpCode'),
              submit: t('form.submit'),
              submitting: t('form.submitting'),
              requestOtp: t('form.requestOtp'),
              requestingOtp: t('form.requestingOtp'),
              verifyOtp: t('form.verifyOtp'),
              verifyingOtp: t('form.verifyingOtp'),
              otpSent: t('form.otpSent'),
              otpRequestError: t('form.otpRequestError'),
              invalidOtp: t('form.invalidOtp'),
              invalidCredentials: t('form.invalidCredentials'),
              requiredEmail: t('form.requiredEmail'),
              invalidEmail: t('form.invalidEmail'),
              requiredPassword: t('form.requiredPassword'),
              requiredOtp: t('form.requiredOtp'),
              registerPrompt: t('form.registerPrompt'),
              registerCta: t('form.registerCta'),
              socialDivider: t('form.social.divider'),
              socialProviders: {
                google: t('form.social.providers.google'),
                facebook: t('form.social.providers.facebook'),
                x: t('form.social.providers.x'),
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
