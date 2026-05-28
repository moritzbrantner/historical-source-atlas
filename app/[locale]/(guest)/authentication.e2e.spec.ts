import { expect, test, type Page } from '@playwright/test';

import {
  expectSignedInProfile,
  extractFirstUrl,
  getSeededUser,
  gotoAndWaitForHydration,
  loginWithCredentials,
  logoutFromProfileMenu,
  waitForMailpitMessage,
} from '@/scripts/e2e/helpers';

const seededUser = getSeededUser('user@example.com');

async function completeRegistrationForm(
  page: Page,
  {
    displayName,
    email,
    password,
  }: {
    displayName: string;
    email: string;
    password: string;
  },
) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Display name').fill(displayName);
  await page.getByRole('button', { name: 'Create account' }).click();
}

test.describe('authentication', () => {
  test('shows client-side validation errors on the registration form', async ({
    page,
  }) => {
    await gotoAndWaitForHydration(page, '/en/register');

    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('Email is required.')).toBeVisible();

    await page.getByLabel('Email', { exact: true }).fill('invalid');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();

    await page.getByLabel('Email', { exact: true }).fill('new@example.com');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Password is required.')).toBeVisible();
    await expect(page.getByText('Please confirm your password.')).toBeVisible();
  });

  test('shows login errors for invalid credentials', async ({ page }) => {
    await gotoAndWaitForHydration(page, '/en/login');

    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(
      page.getByText('Email or password is incorrect.'),
    ).toBeVisible();
    await expect(page).toHaveURL('/en/login');
  });

  test('registers a new account and waits for email verification before login', async ({
    page,
  }) => {
    const email = `playwright-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = 'StrongPass123';

    await gotoAndWaitForHydration(page, '/en/register');

    await expect(
      page.getByRole('heading', {
        name: 'Start with a secure account and verify your email.',
      }),
    ).toBeVisible();

    await completeRegistrationForm(page, {
      displayName: 'Playwright User',
      email,
      password,
    });

    await expect(page.getByRole('status')).toContainText(
      'Account created. Check your email and confirm the verification link before logging in.',
    );
    await expect(page).toHaveURL('/en/register');

    await gotoAndWaitForHydration(page, '/en/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(
      page.getByText('Please verify your email address before logging in.'),
    ).toBeVisible();

    const verificationMessage = await waitForMailpitMessage({
      to: email,
      subject: 'Verify your email address',
    });
    const verificationUrl = extractFirstUrl(verificationMessage.raw);

    await gotoAndWaitForHydration(page, verificationUrl);
    await expect(
      page.getByText(
        'Your email is verified. You can continue using your account.',
      ),
    ).toBeVisible();

    await loginWithCredentials(page, email, password);
    await expectSignedInProfile(page, 'Playwright User');
    await logoutFromProfileMenu(page);
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('requests a password reset from the register page and signs in with the new password', async ({
    page,
  }) => {
    const email = `reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const password = 'StrongPass123';
    const nextPassword = 'EvenStronger123';

    await gotoAndWaitForHydration(page, '/en/register');

    await completeRegistrationForm(page, {
      displayName: 'Reset User',
      email,
      password,
    });

    const verificationMessage = await waitForMailpitMessage({
      to: email,
      subject: 'Verify your email address',
    });
    await gotoAndWaitForHydration(
      page,
      extractFirstUrl(verificationMessage.raw),
    );

    await gotoAndWaitForHydration(page, '/en/register');

    await page.getByLabel('Account email').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByRole('status')).toContainText(
      'If that account exists, a reset link is on its way.',
    );

    const resetMessage = await waitForMailpitMessage({
      to: email,
      subject: 'Reset your password',
    });
    const resetUrl = extractFirstUrl(resetMessage.raw);

    await gotoAndWaitForHydration(page, resetUrl);
    await page.getByLabel('New password', { exact: true }).fill(nextPassword);
    await page
      .getByLabel('Confirm new password', { exact: true })
      .fill(nextPassword);
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByRole('status')).toContainText(
      'Your password has been updated. You can sign in now.',
    );

    await loginWithCredentials(page, email, nextPassword);
    await logoutFromProfileMenu(page);
  });

  test('rejects duplicate account creation on the registration page', async ({
    page,
  }) => {
    await gotoAndWaitForHydration(page, '/en/register');

    await completeRegistrationForm(page, {
      displayName: 'Existing User',
      email: seededUser.email,
      password: 'StrongPass123',
    });

    await expect(
      page.getByText('An account already exists for this email.'),
    ).toBeVisible();
    await expect(page).toHaveURL('/en/register');
  });

  test('redirects authenticated users away from login and register pages', async ({
    page,
  }) => {
    await loginWithCredentials(page, seededUser.email, seededUser.password);

    await page.goto('/en/login');
    await expect(page).toHaveURL('/en/profile');
    await gotoAndWaitForHydration(page, '/en/register');
    await expect(page).toHaveURL('/en/profile');
  });

  test('logs in through the custom page, logs out, and loses access to protected pages', async ({
    page,
  }) => {
    await loginWithCredentials(page, seededUser.email, seededUser.password);
    await expectSignedInProfile(page, seededUser.name);

    await logoutFromProfileMenu(page);
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

    await gotoAndWaitForHydration(page, '/en/profile');
    await expect(page).toHaveURL('/en');
  });
});
