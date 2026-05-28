import type { AppRole } from '@/lib/authorization';
import { getDb } from '@/src/db/client';
import { siteSettings } from '@/src/db/schema';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import { sendEmail } from '@/src/email/service';
import {
  emailTemplateDefinitions,
  emailTemplateIds,
  getDefaultEmailTemplateValues,
  getEmailTemplateDefinition,
  isEmailTemplateId,
  mergeEmailTemplateContent,
  renderEmailTemplate,
  type EmailTemplateContent,
  type EmailTemplateId,
  type RenderedEmailTemplate,
} from '@/src/email/templates';
import { getPublicSiteConfig } from '@/src/site-config/service';

export type AdminEmailTemplateListItem = {
  id: EmailTemplateId;
  label: string;
  description: string;
  content: EmailTemplateContent;
  isCustomized: boolean;
};

export type AdminEmailRecipientOption = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
};

export type AdminEmailTemplatePageData = {
  templates: AdminEmailTemplateListItem[];
  recipients: AdminEmailRecipientOption[];
};

export type EmailTemplateSaveError = {
  message: string;
  fieldErrors: Partial<Record<keyof EmailTemplateContent, string>>;
};

export type EmailTemplateSendError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DELIVERY_ERROR';
  message: string;
};

const EMAIL_TEMPLATE_SETTING_KEY = 'email.templates';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}

function normalizeDisplayName(user: {
  name: string | null;
  tag: string;
  email: string | null;
}) {
  return user.name?.trim() || user.tag || user.email || 'Selected user';
}

function normalizeTemplateContent(
  input: EmailTemplateContent,
): ServiceResult<EmailTemplateContent, EmailTemplateSaveError> {
  const content = {
    subject: input.subject.trim(),
    preview: input.preview.trim(),
    heading: input.heading.trim(),
    body: input.body.trim(),
    ctaLabel: input.ctaLabel.trim(),
    footer: input.footer.trim(),
  };
  const fieldErrors: EmailTemplateSaveError['fieldErrors'] = {};

  if (content.subject.length < 3)
    fieldErrors.subject = 'Subject must be at least 3 characters.';
  if (content.heading.length < 3)
    fieldErrors.heading = 'Heading must be at least 3 characters.';
  if (content.body.length < 5)
    fieldErrors.body = 'Body must be at least 5 characters.';
  if (content.ctaLabel.length < 2)
    fieldErrors.ctaLabel = 'CTA label must be at least 2 characters.';
  if (content.footer.length < 5)
    fieldErrors.footer = 'Footer must be at least 5 characters.';

  if (Object.keys(fieldErrors).length > 0) {
    return failure({
      message: 'Check the highlighted email template fields.',
      fieldErrors,
    });
  }

  return success(content);
}

function parseEmailTemplateOverrides(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, override]) => isEmailTemplateId(key) && isRecord(override),
      ),
    ) as Partial<Record<EmailTemplateId, Partial<EmailTemplateContent>>>;
  } catch {
    return {};
  }
}

async function getEmailTemplateOverrides() {
  let row: { value: string } | undefined;

  try {
    row = await getDb().query.siteSettings.findFirst({
      where: (table, { eq: innerEq }) =>
        innerEq(table.key, EMAIL_TEMPLATE_SETTING_KEY),
      columns: {
        value: true,
      },
    });
  } catch {
    row = undefined;
  }

  return parseEmailTemplateOverrides(row?.value);
}

async function saveEmailTemplateOverrides(
  overrides: Partial<Record<EmailTemplateId, Partial<EmailTemplateContent>>>,
) {
  await getDb()
    .insert(siteSettings)
    .values({
      key: EMAIL_TEMPLATE_SETTING_KEY,
      value: JSON.stringify(overrides),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: JSON.stringify(overrides),
        updatedAt: new Date(),
      },
    });
}

export async function listAdminEmailTemplates(): Promise<
  AdminEmailTemplateListItem[]
> {
  const overrides = await getEmailTemplateOverrides();

  return emailTemplateDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    content: mergeEmailTemplateContent(definition.id, overrides[definition.id]),
    isCustomized: Boolean(overrides[definition.id]),
  }));
}

export async function getAdminEmailTemplatePageData(): Promise<AdminEmailTemplatePageData> {
  const [templates, userRecords] = await Promise.all([
    listAdminEmailTemplates(),
    getDb().query.users.findMany({
      orderBy: (table, { asc }) => [asc(table.email)],
    }),
  ]);

  return {
    templates,
    recipients: userRecords.flatMap((user) =>
      user.email
        ? [
            {
              id: user.id,
              displayName: normalizeDisplayName(user),
              email: user.email,
              role: user.role,
            },
          ]
        : [],
    ),
  };
}

export async function renderAdminEmailTemplatePreview(
  templateId: EmailTemplateId,
): Promise<RenderedEmailTemplate> {
  const overrides = await getEmailTemplateOverrides();
  return renderEmailTemplate(
    templateId,
    getDefaultEmailTemplateValues(templateId),
    mergeEmailTemplateContent(templateId, overrides[templateId]),
  );
}

export async function saveAdminEmailTemplate(
  templateId: EmailTemplateId,
  input: EmailTemplateContent,
): Promise<ServiceResult<EmailTemplateContent, EmailTemplateSaveError>> {
  const validationResult = normalizeTemplateContent(input);

  if (!validationResult.ok) {
    return validationResult;
  }

  const overrides = await getEmailTemplateOverrides();
  overrides[templateId] = validationResult.data;
  await saveEmailTemplateOverrides(overrides);

  return validationResult;
}

export async function resetAdminEmailTemplate(templateId: EmailTemplateId) {
  const overrides = await getEmailTemplateOverrides();
  delete overrides[templateId];
  await saveEmailTemplateOverrides(overrides);
}

export function readEmailTemplateContentFromFormData(
  formData: FormData,
): EmailTemplateContent {
  return {
    subject: readString(formData.get('subject')),
    preview: readString(formData.get('preview')),
    heading: readString(formData.get('heading')),
    body: readString(formData.get('body')),
    ctaLabel: readString(formData.get('ctaLabel')),
    footer: readString(formData.get('footer')),
  };
}

export async function sendAdminEmailTemplate(input: {
  templateId: EmailTemplateId;
  targetUserId: string;
  values: Record<string, string>;
}): Promise<ServiceResult<{ recipientEmail: string }, EmailTemplateSendError>> {
  if (!emailTemplateIds.includes(input.templateId)) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Choose a valid email template.',
    });
  }

  const targetUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, input.targetUserId),
  });

  if (!targetUser?.email) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Choose a user with an email address.',
    });
  }

  const [overrides, siteConfig] = await Promise.all([
    getEmailTemplateOverrides(),
    getPublicSiteConfig(),
  ]);
  const content = mergeEmailTemplateContent(
    input.templateId,
    overrides[input.templateId],
  );
  const values = {
    ...getDefaultEmailTemplateValues(input.templateId),
    siteName: siteConfig.siteName,
    name: normalizeDisplayName(targetUser),
    email: targetUser.email,
    ...input.values,
  };
  const message = await renderEmailTemplate(input.templateId, values, content);

  try {
    await sendEmail({
      to: targetUser.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: ['admin-email-template', input.templateId],
    });
  } catch (error) {
    return failure({
      code: 'DELIVERY_ERROR',
      message:
        error instanceof Error ? error.message : 'Unable to send the email.',
    });
  }

  return success({
    recipientEmail: targetUser.email,
  });
}

export async function getEmailTemplateContentForLifecycle(
  templateId: EmailTemplateId,
) {
  const overrides = await getEmailTemplateOverrides();
  return mergeEmailTemplateContent(templateId, overrides[templateId]);
}

export { getEmailTemplateDefinition };
