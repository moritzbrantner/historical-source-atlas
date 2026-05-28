'use client';

import type { ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { useLocale, useTranslations } from '@/src/i18n';
import {
  backgroundOptions,
  formatDatePreview,
} from '@/src/settings/preferences';
import { useAppSettings } from '@/src/settings/provider';
import type { AppSettingsSection } from '@/src/settings/sections';

const sampleDate = new Date('2026-04-27T09:00:00.000Z');

export function AppSettingsPanel({ section }: { section: AppSettingsSection }) {
  const t = useTranslations('SettingsPage');
  const locale = useLocale();
  const { settings, updateSettings } = useAppSettings();
  const datePreview = formatDatePreview(sampleDate, settings, locale);

  switch (section) {
    case 'appearance':
      return (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {backgroundOptions.map((option) => {
              const isActive = settings.background === option;

              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => updateSettings({ background: option })}
                  className={[
                    'rounded-2xl border p-4 text-left transition-colors',
                    isActive
                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-200 bg-white/70 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-600',
                  ].join(' ')}
                >
                  <p className="font-medium">
                    {t(`appearance.backgrounds.${option}.title`)}
                  </p>
                  <p className="mt-2 text-sm opacity-80">
                    {t(`appearance.backgrounds.${option}.description`)}
                  </p>
                </button>
              );
            })}
          </div>

          <ToggleRow
            title={t('appearance.compactSpacing')}
            description={t('appearance.compactSpacingDescription')}
            checked={settings.compactSpacing}
            onChange={(checked) => updateSettings({ compactSpacing: checked })}
          />

          <ToggleRow
            title={t('appearance.reducedMotion')}
            description={t('appearance.reducedMotionDescription')}
            checked={settings.reducedMotion}
            onChange={(checked) => updateSettings({ reducedMotion: checked })}
          />
        </div>
      );

    case 'dates':
      return (
        <div className="space-y-5">
          <FieldBlock label={t('dates.formatLabel')}>
            <select
              aria-label={t('dates.formatLabel')}
              value={settings.dateFormat}
              onChange={(event) =>
                updateSettings({
                  dateFormat: event.target.value as typeof settings.dateFormat,
                })
              }
              className={selectClassName}
            >
              <option value="localized">{t('dates.formats.localized')}</option>
              <option value="long">{t('dates.formats.long')}</option>
              <option value="iso">{t('dates.formats.iso')}</option>
            </select>
          </FieldBlock>

          <FieldBlock label={t('dates.weekStartsLabel')}>
            <select
              aria-label={t('dates.weekStartsLabel')}
              value={String(settings.weekStartsOn)}
              onChange={(event) =>
                updateSettings({
                  weekStartsOn: event.target.value === '0' ? 0 : 1,
                })
              }
              className={selectClassName}
            >
              <option value="1">{t('dates.weekStarts.monday')}</option>
              <option value="0">{t('dates.weekStarts.sunday')}</option>
            </select>
          </FieldBlock>

          <ToggleRow
            title={t('dates.showOutsideDays')}
            description={t('dates.showOutsideDaysDescription')}
            checked={settings.showOutsideDays}
            onChange={(checked) => updateSettings({ showOutsideDays: checked })}
          />

          <div className="rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
            <p className="text-sm font-medium">{t('dates.previewLabel')}</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {datePreview}
            </p>
          </div>
        </div>
      );

    case 'workflow':
      return (
        <div className="space-y-5">
          <ToggleRow
            title={t('workflow.hotkeyHints')}
            description={t('workflow.hotkeyHintsDescription')}
            checked={settings.showHotkeyHints}
            onChange={(checked) => updateSettings({ showHotkeyHints: checked })}
          />

          <div className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            {t('workflow.hotkeySummary')}
          </div>
        </div>
      );

    case 'notifications':
      return (
        <div className="space-y-5">
          <ToggleRow
            title={t('notifications.enabled')}
            description={t('notifications.enabledDescription')}
            checked={settings.notifications.enabled}
            onChange={(checked) =>
              updateSettings((currentSettings) => ({
                notifications: {
                  ...currentSettings.notifications,
                  enabled: checked,
                },
              }))
            }
          />

          <FieldBlock
            label={t('notifications.typeLabel')}
            description={t('notifications.typeDescription')}
          >
            <Input
              aria-label={t('notifications.typeLabel')}
              value={settings.notifications.type}
              onChange={(event) =>
                updateSettings((currentSettings) => ({
                  notifications: {
                    ...currentSettings.notifications,
                    type: event.target.value,
                  },
                }))
              }
              placeholder={t('notifications.typePlaceholder')}
            />
          </FieldBlock>

          <div className="flex flex-wrap gap-2">
            {(['instant', 'digest', 'silent'] as const).map((option) => {
              const isActive = settings.notifications.type === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    updateSettings((currentSettings) => ({
                      notifications: {
                        ...currentSettings.notifications,
                        type: option,
                      },
                    }))
                  }
                  className={[
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900',
                  ].join(' ')}
                >
                  {t(`notifications.types.${option}`)}
                </button>
              );
            })}
          </div>
        </div>
      );
  }
}

function FieldBlock({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border p-4 dark:border-zinc-800">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      </div>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4"
      />
    </label>
  );
}

const selectClassName = [
  'flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:focus-visible:ring-zinc-50',
].join(' ');
