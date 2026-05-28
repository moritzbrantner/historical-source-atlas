import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocalizedLink } from '@/i18n/server-link';
import { withLocalePath, type AppLocale } from '@/i18n/routing';
import { isSuperAdmin } from '@/lib/authorization';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import { getAuthSession } from '@/src/auth.server';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import {
  getAdminEmailTemplatePageData,
  readEmailTemplateContentFromFormData,
  renderAdminEmailTemplatePreview,
  resetAdminEmailTemplate,
  saveAdminEmailTemplate,
  sendAdminEmailTemplate,
} from '@/src/email/admin-template-service';
import {
  getDefaultEmailTemplateValues,
  getEmailTemplateDefinition,
  isEmailTemplateId,
  type EmailTemplateContent,
  type EmailTemplateId,
} from '@/src/email/templates';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

const selectClassName = [
  'flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:ring-zinc-50',
].join(' ');

function getTemplateRedirectPath(
  locale: AppLocale,
  templateId: EmailTemplateId,
  status?: string,
) {
  const params = new URLSearchParams({ template: templateId });

  if (status) {
    params.set('status', status);
  }

  return withLocalePath(`/admin/email-templates?${params.toString()}`, locale);
}

function readTemplateId(formData: FormData): EmailTemplateId {
  const templateId = String(formData.get('templateId') ?? '');

  if (!isEmailTemplateId(templateId)) {
    throw new Error('Invalid email template.');
  }

  return templateId;
}

async function saveEmailTemplateAction(formData: FormData) {
  'use server';

  const session = await getAuthSession();

  if (
    !(await hasPermissionForRole(
      session?.user.role,
      'admin.systemSettings.edit',
    ))
  ) {
    throw new Error('Forbidden');
  }

  const locale = resolveLocale(String(formData.get('locale') ?? 'en'));
  const templateId = readTemplateId(formData);
  const result = await saveAdminEmailTemplate(
    templateId,
    readEmailTemplateContentFromFormData(formData),
  );

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath(withLocalePath('/admin/email-templates', locale));
  redirect(getTemplateRedirectPath(locale, templateId, 'saved'));
}

async function resetEmailTemplateAction(formData: FormData) {
  'use server';

  const session = await getAuthSession();

  if (
    !(await hasPermissionForRole(
      session?.user.role,
      'admin.systemSettings.edit',
    ))
  ) {
    throw new Error('Forbidden');
  }

  const locale = resolveLocale(String(formData.get('locale') ?? 'en'));
  const templateId = readTemplateId(formData);

  await resetAdminEmailTemplate(templateId);
  revalidatePath(withLocalePath('/admin/email-templates', locale));
  redirect(getTemplateRedirectPath(locale, templateId, 'reset'));
}

async function sendEmailTemplateAction(formData: FormData) {
  'use server';

  const session = await getAuthSession();

  if (!(await hasPermissionForRole(session?.user.role, 'admin.users.notify'))) {
    throw new Error('Forbidden');
  }

  const locale = resolveLocale(String(formData.get('locale') ?? 'en'));
  const templateId = readTemplateId(formData);

  if (
    templateId === 'accountVerification' &&
    !isSuperAdmin(session?.user.role)
  ) {
    throw new Error('Forbidden');
  }

  const definition = getEmailTemplateDefinition(templateId);
  const values = Object.fromEntries(
    definition.variables.map((variable) => [
      variable.key,
      String(formData.get(`variable:${variable.key}`) ?? ''),
    ]),
  );
  const result = await sendAdminEmailTemplate({
    templateId,
    targetUserId: String(formData.get('targetUserId') ?? ''),
    values,
  });

  if (!result.ok) {
    redirect(
      getTemplateRedirectPath(
        locale,
        templateId,
        `send-error:${encodeURIComponent(result.error.message)}`,
      ),
    );
  }

  redirect(getTemplateRedirectPath(locale, templateId, 'sent'));
}

function StatusBanner({ status }: { status: string | null }) {
  if (!status) {
    return null;
  }

  if (status.startsWith('send-error:')) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        {decodeURIComponent(status.slice('send-error:'.length)) ||
          'Unable to send the email.'}
      </div>
    );
  }

  const messages: Record<string, string> = {
    saved: 'Email template saved.',
    reset: 'Email template reset to its default copy.',
    sent: 'Email sent to the selected user.',
  };

  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
      {messages[status] ?? 'Email template updated.'}
    </div>
  );
}

function TemplateField({
  name,
  label,
  defaultValue,
  multiline = false,
  disabled,
}: {
  name: keyof EmailTemplateContent;
  label: string;
  defaultValue: string;
  multiline?: boolean;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`email-template-${name}`}>{label}</Label>
      {multiline ? (
        <Textarea
          id={`email-template-${name}`}
          name={name}
          defaultValue={defaultValue}
          disabled={disabled}
          required
        />
      ) : (
        <Input
          id={`email-template-${name}`}
          name={name}
          defaultValue={defaultValue}
          disabled={disabled}
          required
        />
      )}
    </div>
  );
}

export default async function AdminEmailTemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const requestedSearchParams = await searchParams;
  const requestedTemplateId = Array.isArray(requestedSearchParams?.template)
    ? requestedSearchParams?.template[0]
    : requestedSearchParams?.template;
  const status = Array.isArray(requestedSearchParams?.status)
    ? (requestedSearchParams?.status[0] ?? null)
    : (requestedSearchParams?.status ?? null);

  await notFoundUnlessFeatureEnabled('admin.systemSettings');
  const session = await requirePermission(locale, 'admin.systemSettings.read');
  const t = createTranslator(locale, 'AdminPage');
  const [adminPages, data, canEditTemplates, canSendTemplates] =
    await Promise.all([
      getAuthorizedAdminPageDefinitions(session.user.role),
      getAdminEmailTemplatePageData(),
      hasPermissionForRole(session.user.role, 'admin.systemSettings.edit'),
      hasPermissionForRole(session.user.role, 'admin.users.notify'),
    ]);
  const selectedTemplateId =
    requestedTemplateId && isEmailTemplateId(requestedTemplateId)
      ? requestedTemplateId
      : data.templates[0]!.id;
  const selectedTemplate =
    data.templates.find((template) => template.id === selectedTemplateId) ??
    data.templates[0]!;
  const selectedDefinition = getEmailTemplateDefinition(selectedTemplate.id);
  const preview = await renderAdminEmailTemplatePreview(selectedTemplate.id);
  const defaultSendValues = getDefaultEmailTemplateValues(selectedTemplate.id);
  const canSendSelectedTemplate =
    canSendTemplates &&
    (selectedTemplate.id !== 'accountVerification' ||
      isSuperAdmin(session.user.role));

  return (
    <AdminPageShell
      title={t('emailTemplates.title')}
      description={t('emailTemplates.description')}
      adminPages={adminPages}
    >
      <StatusBanner status={status} />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          {data.templates.map((template) => {
            const isActive = template.id === selectedTemplate.id;

            return (
              <LocalizedLink
                key={template.id}
                href={`/admin/email-templates?template=${template.id}`}
                locale={locale}
                className={[
                  'block rounded-2xl border p-4 transition-colors',
                  isActive
                    ? 'border-zinc-950 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900'
                    : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {template.label}
                  </p>
                  {template.isCustomized ? (
                    <Badge variant="secondary">Edited</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {template.description}
                </p>
              </LocalizedLink>
            );
          })}
        </aside>

        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>{selectedTemplate.label}</CardTitle>
                <CardDescription>
                  {selectedTemplate.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={saveEmailTemplateAction} className="space-y-4">
                  <input type="hidden" name="locale" value={locale} />
                  <input
                    type="hidden"
                    name="templateId"
                    value={selectedTemplate.id}
                  />
                  <TemplateField
                    name="subject"
                    label="Subject"
                    defaultValue={selectedTemplate.content.subject}
                    disabled={!canEditTemplates}
                  />
                  <TemplateField
                    name="preview"
                    label="Inbox preview"
                    defaultValue={selectedTemplate.content.preview}
                    disabled={!canEditTemplates}
                  />
                  <TemplateField
                    name="heading"
                    label="Heading"
                    defaultValue={selectedTemplate.content.heading}
                    disabled={!canEditTemplates}
                  />
                  <TemplateField
                    name="body"
                    label="Body"
                    defaultValue={selectedTemplate.content.body}
                    disabled={!canEditTemplates}
                    multiline
                  />
                  <TemplateField
                    name="ctaLabel"
                    label="Button label"
                    defaultValue={selectedTemplate.content.ctaLabel}
                    disabled={!canEditTemplates}
                  />
                  <TemplateField
                    name="footer"
                    label="Footer"
                    defaultValue={selectedTemplate.content.footer}
                    disabled={!canEditTemplates}
                    multiline
                  />

                  <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      Available variables
                    </p>
                    <p>
                      {selectedDefinition.variables
                        .map((variable) => `{{${variable.key}}}`)
                        .join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={!canEditTemplates}
                      className={buttonVariants({})}
                    >
                      Save template
                    </button>
                  </div>
                </form>

                <form action={resetEmailTemplateAction} className="mt-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input
                    type="hidden"
                    name="templateId"
                    value={selectedTemplate.id}
                  />
                  <button
                    type="submit"
                    disabled={
                      !canEditTemplates || !selectedTemplate.isCustomized
                    }
                    className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  >
                    Reset to default
                  </button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Send email</CardTitle>
                <CardDescription>
                  Send the selected template to a user with the values below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={sendEmailTemplateAction} className="space-y-4">
                  <input type="hidden" name="locale" value={locale} />
                  <input
                    type="hidden"
                    name="templateId"
                    value={selectedTemplate.id}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="targetUserId">Recipient</Label>
                    <select
                      id="targetUserId"
                      name="targetUserId"
                      className={selectClassName}
                      disabled={
                        !canSendSelectedTemplate || data.recipients.length === 0
                      }
                      required
                    >
                      {data.recipients.map((recipient) => (
                        <option key={recipient.id} value={recipient.id}>
                          {recipient.displayName} | {recipient.email} |{' '}
                          {recipient.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDefinition.variables.map((variable) => (
                    <div key={variable.key} className="space-y-2">
                      <Label htmlFor={`variable-${variable.key}`}>
                        {variable.label}
                      </Label>
                      {variable.key === 'message' ? (
                        <Textarea
                          id={`variable-${variable.key}`}
                          name={`variable:${variable.key}`}
                          defaultValue={
                            defaultSendValues[variable.key] ??
                            variable.defaultValue
                          }
                          disabled={!canSendSelectedTemplate}
                          required
                        />
                      ) : (
                        <Input
                          id={`variable-${variable.key}`}
                          name={`variable:${variable.key}`}
                          defaultValue={
                            defaultSendValues[variable.key] ??
                            variable.defaultValue
                          }
                          disabled={!canSendSelectedTemplate}
                          required
                        />
                      )}
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={
                      !canSendSelectedTemplate || data.recipients.length === 0
                    }
                    className={buttonVariants({})}
                  >
                    Send email
                  </button>
                </form>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>{preview.subject}</CardDescription>
            </CardHeader>
            <CardContent>
              <iframe
                title={`${selectedTemplate.label} preview`}
                srcDoc={preview.html}
                className="h-[560px] w-full rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
