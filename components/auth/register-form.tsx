'use client';

import { useState } from 'react';
import {
  type FieldErrors,
  type UseFormRegister,
  useForm,
  useWatch,
} from 'react-hook-form';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import type { AuthProvider } from '@/src/auth';
import { readProblemDetail } from '@/src/http/problem-client';

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterStep = 'email' | 'password' | 'profile';

type RegisterFormProps = {
  locale: AppLocale;
  labels: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    submit: string;
    submitting: string;
    success: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredPassword: string;
    weakPassword: string;
    requiredConfirmPassword: string;
    passwordMismatch: string;
    nameTooLong: string;
    continue: string;
    back: string;
    genericError: string;
    loginPrompt: string;
    loginCta: string;
    socialDivider: string;
    socialProviders: Record<AuthProvider, string>;
  };
  oauthErrorMessage?: string | null;
  returnTo: '/register';
};

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

function EmailStep({
  locale,
  returnTo,
  oauthErrorMessage,
  labels,
  register,
  errors,
  onContinue,
}: {
  locale: AppLocale;
  returnTo: '/register';
  oauthErrorMessage?: string | null;
  labels: RegisterFormProps['labels'];
  register: UseFormRegister<RegisterFormValues>;
  errors: FieldErrors<RegisterFormValues>;
  onContinue: () => void;
}) {
  return (
    <>
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
        <Label htmlFor="register-email">{labels.email}</Label>
        <Input
          id="register-email"
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

      <Button type="button" className="w-full" onClick={onContinue}>
        {labels.continue}
      </Button>
    </>
  );
}

function PasswordStep({
  labels,
  register,
  errors,
  password,
  onBack,
  onContinue,
}: {
  labels: RegisterFormProps['labels'];
  register: UseFormRegister<RegisterFormValues>;
  errors: FieldErrors<RegisterFormValues>;
  password: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="register-password">{labels.password}</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password', {
            required: labels.requiredPassword,
            pattern: {
              value: passwordPattern,
              message: labels.weakPassword,
            },
          })}
        />
        {errors.password ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">
          {labels.confirmPassword}
        </Label>
        <Input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          {...register('confirmPassword', {
            required: labels.requiredConfirmPassword,
            validate: (value) => value === password || labels.passwordMismatch,
          })}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {labels.back}
        </Button>
        <Button type="button" onClick={onContinue}>
          {labels.continue}
        </Button>
      </div>
    </>
  );
}

function ProfileStep({
  labels,
  register,
  errors,
  pending,
  onBack,
}: {
  labels: RegisterFormProps['labels'];
  register: UseFormRegister<RegisterFormValues>;
  errors: FieldErrors<RegisterFormValues>;
  pending: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="register-name">{labels.name}</Label>
        <Input
          id="register-name"
          autoComplete="name"
          aria-invalid={errors.name ? 'true' : 'false'}
          {...register('name', {
            maxLength: {
              value: 80,
              message: labels.nameTooLong,
            },
          })}
        />
        {errors.name ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onBack}>
          {labels.back}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? labels.submitting : labels.submit}
        </Button>
      </div>
    </>
  );
}

export function RegisterForm({
  locale,
  labels,
  oauthErrorMessage,
  returnTo,
}: RegisterFormProps) {
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<RegisterStep>('email');
  const [submitted, setSubmitted] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    setError,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = useWatch({
    control,
    name: 'password',
  });

  const continueToPasswordStep = async () => {
    if (await trigger('email', { shouldFocus: true })) {
      setStep('password');
    }
  };

  const continueToProfileStep = async () => {
    if (await trigger(['password', 'confirmPassword'], { shouldFocus: true })) {
      setStep('profile');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);

    const response = await fetch('/api/account/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: values.name.trim() || undefined,
        email: values.email,
        password: values.password,
        locale,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, labels.genericError);
      let errorStep: RegisterStep | null = null;

      if (problem.fieldErrors.email?.[0]) {
        errorStep = 'email';
        setError('email', {
          type: 'server',
          message: problem.fieldErrors.email[0],
        });
      }

      if (problem.fieldErrors.password?.[0]) {
        errorStep ??= 'password';
        setError('password', {
          type: 'server',
          message: problem.fieldErrors.password[0],
        });
      }

      if (problem.fieldErrors.confirmPassword?.[0]) {
        errorStep ??= 'password';
        setError('confirmPassword', {
          type: 'server',
          message: problem.fieldErrors.confirmPassword[0],
        });
      }

      if (problem.fieldErrors.name?.[0]) {
        errorStep ??= 'profile';
        setError('name', {
          type: 'server',
          message: problem.fieldErrors.name[0],
        });
      }

      if (errorStep) {
        setStep(errorStep);
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

    setPending(false);
    setSubmitted(true);
  });

  if (submitted) {
    return (
      <div className="space-y-5">
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {labels.success}
        </p>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {labels.loginPrompt}{' '}
          <Link
            href="/login"
            locale={locale}
            className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
          >
            {labels.loginCta}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {step === 'email' ? (
        <EmailStep
          locale={locale}
          returnTo={returnTo}
          oauthErrorMessage={oauthErrorMessage}
          labels={labels}
          register={register}
          errors={errors}
          onContinue={continueToPasswordStep}
        />
      ) : null}

      {step === 'password' ? (
        <PasswordStep
          labels={labels}
          register={register}
          errors={errors}
          password={password}
          onBack={() => setStep('email')}
          onContinue={continueToProfileStep}
        />
      ) : null}

      {step === 'profile' ? (
        <ProfileStep
          labels={labels}
          register={register}
          errors={errors}
          pending={pending}
          onBack={() => setStep('password')}
        />
      ) : null}

      {errors.root?.message ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errors.root.message}
        </p>
      ) : null}

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {labels.loginPrompt}{' '}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
        >
          {labels.loginCta}
        </Link>
      </p>
    </form>
  );
}
