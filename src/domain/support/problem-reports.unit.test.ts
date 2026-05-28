import { describe, expect, it } from 'vitest';

import { validateProblemReportInput } from './problem-reports';

describe('problem report validation', () => {
  it('normalizes valid problem report input', () => {
    expect(
      validateProblemReportInput({
        name: ' Ada ',
        email: ' ADA@example.COM ',
        area: 'bug',
        pageUrl: 'https://app.example.com/settings',
        subject: 'Settings modal closes',
        details:
          'Saving settings closes the modal before the success message can be reviewed.',
      }),
    ).toEqual({
      ok: true,
      value: {
        name: 'Ada',
        email: 'ada@example.com',
        area: 'bug',
        pageUrl: 'https://app.example.com/settings',
        subject: 'Settings modal closes',
        details:
          'Saving settings closes the modal before the success message can be reviewed.',
      },
    });
  });

  it('rejects incomplete reports', () => {
    expect(
      validateProblemReportInput({
        email: 'missing-at',
        area: 'unknown',
        subject: 'Short',
        details: 'Too short.',
      }),
    ).toMatchObject({
      ok: false,
    });
  });
});
