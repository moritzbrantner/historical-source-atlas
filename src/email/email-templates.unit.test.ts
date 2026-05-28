import { describe, expect, it } from 'vitest';

import {
  mergeEmailTemplateContent,
  renderEmailTemplate,
} from '@/src/email/templates';

describe('email templates', () => {
  it('renders editable React Email content with variables', async () => {
    const content = mergeEmailTemplateContent('adminMessage', {
      subject: 'Notice for {{name}}',
      body: 'Hi {{name}},\n\n{{message}}',
    });

    const rendered = await renderEmailTemplate(
      'adminMessage',
      {
        name: 'Casey',
        message: 'Review the updated workspace policy.',
        actionUrl: 'https://example.com/settings',
        siteName: 'Test App',
      },
      content,
    );

    expect(rendered.subject).toBe('Notice for Casey');
    expect(rendered.html).toContain('Review the updated workspace policy.');
    expect(rendered.text).toContain(
      'Open workspace https://example.com/settings',
    );
  });
});
