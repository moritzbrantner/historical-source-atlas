// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const socialLabels = {
  google: 'Continue with Google',
  facebook: 'Continue with Facebook',
  x: 'Continue with X',
};

describe('auth social forms', () => {
  it('renders social auth buttons and callback errors on the login form', () => {
    render(
      <LoginForm
        locale="en"
        oauthErrorMessage="Google sign-in failed."
        returnTo="/login"
        labels={{
          email: 'Email',
          password: 'Password',
          otpCode: 'One-time password',
          submit: 'Log in',
          submitting: 'Logging in...',
          requestOtp: 'Email me a login code',
          requestingOtp: 'Sending code...',
          verifyOtp: 'Log in with code',
          verifyingOtp: 'Checking code...',
          otpSent: 'If that account exists, a login code is on its way.',
          otpRequestError: 'Unable to send a login code right now.',
          invalidOtp: 'Invalid one-time password.',
          invalidCredentials: 'Invalid credentials.',
          requiredEmail: 'Email is required.',
          invalidEmail: 'Enter a valid email address.',
          requiredPassword: 'Password is required.',
          requiredOtp: 'Enter the 6-digit code from your email.',
          registerPrompt: 'Need an account?',
          registerCta: 'Create one',
          socialDivider: 'Or continue with',
          socialProviders: socialLabels,
        }}
      />,
    );

    expect(
      screen
        .getByRole('link', { name: /Continue with Google/ })
        .getAttribute('href'),
    ).toBe('/api/auth/oauth/google/start?locale=en&returnTo=%2Flogin');
    expect(
      screen.getByRole('link', { name: /Continue with Facebook/ }),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: /Continue with X/ })).toBeTruthy();
    expect(screen.getByText('Google sign-in failed.')).toBeTruthy();
  });

  it('renders social auth buttons on the register form', () => {
    render(
      <RegisterForm
        locale="en"
        oauthErrorMessage={null}
        returnTo="/register"
        labels={{
          name: 'Display name',
          email: 'Email',
          password: 'Password',
          confirmPassword: 'Confirm password',
          submit: 'Create account',
          submitting: 'Creating account...',
          success: 'Check your email.',
          requiredEmail: 'Email is required.',
          invalidEmail: 'Enter a valid email address.',
          requiredPassword: 'Password is required.',
          weakPassword: 'Weak password.',
          requiredConfirmPassword: 'Please confirm your password.',
          passwordMismatch: 'Passwords do not match.',
          nameTooLong: 'Too long.',
          continue: 'Continue',
          back: 'Back',
          genericError: 'Unable to create account.',
          loginPrompt: 'Already have an account?',
          loginCta: 'Log in',
          socialDivider: 'Or continue with',
          socialProviders: socialLabels,
        }}
      />,
    );

    expect(
      screen
        .getByRole('link', { name: /Continue with Google/ })
        .getAttribute('href'),
    ).toBe('/api/auth/oauth/google/start?locale=en&returnTo=%2Fregister');
    expect(screen.getByText('Or continue with')).toBeTruthy();
  });
});
