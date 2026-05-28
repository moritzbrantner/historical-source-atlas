import { eq } from 'drizzle-orm';

import {
  withLocalePath,
  type AppLocale,
  hasLocale,
  routing,
} from '@/i18n/routing';
import { getEnv } from '@/src/config/env';
import { sendEmail } from '@/src/email/service';
import { getEmailTemplateContentForLifecycle } from '@/src/email/admin-template-service';
import { renderEmailTemplate } from '@/src/email/templates';
import { getDb } from '@/src/db/client';
import { newsletterSubscriptions } from '@/src/db/schema';
import { getLogger } from '@/src/observability/logger';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeLocale(locale?: string): AppLocale {
  return locale && hasLocale(locale) ? locale : routing.defaultLocale;
}

function getBaseUrl() {
  return getEnv().auth.url;
}

export async function subscribeToNewsletter(input: {
  email: string;
  locale?: string;
  source?: string;
}) {
  const email = normalizeEmail(input.email);
  const locale = normalizeLocale(input.locale);

  if (!email || !email.includes('@')) {
    return { ok: false as const, error: 'A valid email is required.' };
  }

  const now = new Date();
  const db = getDb();

  const existing = await db.query.newsletterSubscriptions.findFirst({
    where: (table, { eq: equals }) => equals(table.email, email),
  });

  if (existing) {
    await db
      .update(newsletterSubscriptions)
      .set({
        locale,
        source: input.source ?? existing.source,
        updatedAt: now,
      })
      .where(eq(newsletterSubscriptions.id, existing.id));
  } else {
    await db.insert(newsletterSubscriptions).values({
      id: crypto.randomUUID(),
      email,
      locale,
      source: input.source ?? 'newsletter-api',
      createdAt: now,
      updatedAt: now,
    });
  }

  const manageUrl = `${getBaseUrl()}${withLocalePath('/', locale)}`;

  try {
    const message = await renderEmailTemplate(
      'newsletterWelcome',
      { manageUrl },
      await getEmailTemplateContentForLifecycle('newsletterWelcome'),
    );

    await sendEmail({
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: ['newsletter'],
    });
  } catch (error) {
    getLogger({ subsystem: 'newsletter' }).error(
      { email, err: error },
      'Failed to send welcome email',
    );
  }

  return { ok: true as const };
}
