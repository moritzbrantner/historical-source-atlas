'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Link, useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import type { AuthProvider } from '@/src/auth';
import { readProblemDetail } from '@/src/http/problem-client';

type LoginFormValues = {
  email: string;
  password: string;
  otpCode: string;
};

type LoginFormProps = {
  locale: AppLocale;
  labels: {
    email: string;
    password: string;
    otpCode: string;
    submit: string;
    submitting: string;
    requestOtp: string;
    requestingOtp: string;
    verifyOtp: string;
    verifyingOtp: string;
    otpSent: string;
    otpRequestError: string;
    invalidOtp: string;
    invalidCredentials: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredPassword: string;
    requiredOtp: string;
    registerPrompt: string;
    registerCta: string;
    socialDivider: string;
    socialProviders: Record<AuthProvider, string>;
  };
  oauthErrorMessage?: string | null;
  returnTo: '/login';
};

export function LoginForm({
  locale,
  labels,
  oauthErrorMessage,
  returnTo,
}: LoginFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      otpCode: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        labels.invalidCredentials,
      );

      if (problem.fieldErrors.email?.[0]) {
        setError('email', {
          type: 'server',
          message: problem.fieldErrors.email[0],
        });
      }

      if (problem.fieldErrors.password?.[0]) {
        setError('password', {
          type: 'server',
          message: problem.fieldErrors.password[0],
        });
      }

      if (
        problem.formMessage ||
        Object.keys(problem.fieldErrors).length === 0
      ) {
        setError('root', {
          type: 'server',
          message: problem.formMessage ?? problem.message,
        });
      }

      setPending(false);
      return;
    }

    router.push('/profile', locale);
    router.refresh();
  });

  async function requestOtp() {
    const emailIsValid = await trigger('email');
    if (!emailIsValid) {
      return;
    }

    setOtpPending(true);
    clearErrors();

    const response = await fetch('/api/auth/login/otp/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: getValues('email'),
        locale,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.otpRequestError);
      setError('root', {
        type: 'server',
        message: problem.formMessage ?? problem.message,
      });
      setOtpPending(false);
      return;
    }

    setOtpRequested(true);
    setOtpPending(false);
  }

  async function verifyOtp() {
    const emailIsValid = await trigger('email');
    if (!emailIsValid) {
      return;
    }

    const code = getValues('otpCode').trim();
    if (!/^\d{6}$/.test(code)) {
      setError('otpCode', {
        type: 'manual',
        message: labels.requiredOtp,
      });
      return;
    }

    setOtpPending(true);
    clearErrors();

    const response = await fetch('/api/auth/login/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: getValues('email'),
        code,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.invalidOtp);
      setError('otpCode', {
        type: 'server',
        message: problem.formMessage ?? problem.message,
      });
      setOtpPending(false);
      return;
    }

    router.push('/profile', locale);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <SocialAuthButtons
        locale={locale}
        returnTo={returnTo}
        errorMessage={oauthErrorMessage}
        labels={{
          divider: labels.socialDivider,
          providers: labels.socialProviders,
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="email">{labels.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? 'true' : 'false'}
          {...register('email', {
            required: labels.requiredEmail,
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: labels.invalidEmail,
            },
          })}
        />
        {errors.email ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password', {
            required: labels.requiredPassword,
          })}
        />
        {errors.password ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {errors.root?.message ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>

      <div className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={otpPending || pending}
          onClick={requestOtp}
        >
          {otpPending && !otpRequested
            ? labels.requestingOtp
            : labels.requestOtp}
        </Button>

        {otpRequested ? (
          <div className="space-y-3">
            <p
              className="text-sm text-zinc-600 dark:text-zinc-400"
              aria-live="polite"
            >
              {labels.otpSent}
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp-code">{labels.otpCode}</Label>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                aria-invalid={errors.otpCode ? 'true' : 'false'}
                {...register('otpCode')}
              />
              {errors.otpCode ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.otpCode.message}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={otpPending || pending}
              onClick={verifyOtp}
            >
              {otpPending ? labels.verifyingOtp : labels.verifyOtp}
            </Button>
          </div>
        ) : null}
      </div>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {labels.registerPrompt}{' '}
        <Link
          href="/register"
          className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
        >
          {labels.registerCta}
        </Link>
      </p>
    </form>
  );
}
