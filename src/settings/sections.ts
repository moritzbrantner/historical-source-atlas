export type AppSettingsSection =
  | 'appearance'
  | 'dates'
  | 'workflow'
  | 'notifications';

export type SettingsSection =
  | AppSettingsSection
  | 'profile'
  | 'privacy'
  | 'account';

export const settingsSections = [
  'appearance',
  'dates',
  'workflow',
  'notifications',
  'profile',
  'privacy',
  'account',
] as const satisfies readonly SettingsSection[];

export const settingsSectionSet = new Set<string>(settingsSections);

export function isAppSettingsSection(
  section: SettingsSection,
): section is AppSettingsSection {
  return (
    section === 'appearance' ||
    section === 'dates' ||
    section === 'workflow' ||
    section === 'notifications'
  );
}
