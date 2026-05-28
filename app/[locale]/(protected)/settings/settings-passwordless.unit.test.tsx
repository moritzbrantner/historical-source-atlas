// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SettingsClient } from '@/app/[locale]/(protected)/settings/settings-client';

vi.mock('react-day-picker', () => ({
  DayPicker: () => <div data-testid="day-picker" />,
}));

vi.mock('@/components/profile-image-form', () => ({
  ProfileImageForm: () => <div />,
}));

vi.mock('@/components/profile-search-visibility-form', () => ({
  ProfileSearchVisibilityForm: () => <div />,
}));

vi.mock('@/components/profile-follower-visibility-form', () => ({
  ProfileFollowerVisibilityForm: () => <div />,
}));

vi.mock('@/components/profile-blocked-users-form', () => ({
  ProfileBlockedUsersForm: () => <div />,
}));

vi.mock('@/components/privacy/consent-settings-card', () => ({
  ConsentSettingsCard: () => <div />,
}));

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
  usePathname: () => '/settings/account',
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@/src/i18n', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/src/settings/provider', () => ({
  useAppSettings: () => ({
    settings: {
      background: 'paper',
      compactSpacing: false,
      reducedMotion: false,
      dateFormat: 'localized',
      weekStartsOn: 1,
      showOutsideDays: true,
      showHotkeyHints: false,
      notifications: {
        enabled: true,
        type: 'instant',
      },
    },
    updateSettings: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('passwordless settings state', () => {
  it('disables password-based account controls and shows explanatory copy', () => {
    render(
      <SettingsClient
        locale="en"
        section="account"
        session={{
          user: {
            id: 'user_1',
            email: null,
            tag: 'person',
            name: 'Person Example',
            image: null,
            bannerImage: null,
            role: 'USER',
          },
        }}
        accountCapabilities={{
          hasPassword: false,
          canManageEmailWithPassword: false,
          canDeleteWithPassword: false,
        }}
        consent={{ necessary: true, analytics: false, marketing: false }}
        initialSearchVisibility
        initialFollowerVisibility="PUBLIC"
        initialBlockedProfiles={[]}
      />,
    );

    expect(
      screen.getAllByText('account.passwordlessNotice').length,
    ).toBeGreaterThan(0);
    expect(
      (
        screen.getByLabelText(
          'account.email.currentPassword',
        ) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: 'account.email.save',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByLabelText(
          'account.deletion.currentPassword',
        ) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: 'account.deletion.remove',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
