import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';

export const emailTemplateIds = [
  'accountVerification',
  'passwordReset',
  'loginOneTimePassword',
  'newsletterWelcome',
  'adminMessage',
] as const;

export type EmailTemplateId = (typeof emailTemplateIds)[number];

export type EmailTemplateContent = {
  subject: string;
  preview: string;
  heading: string;
  body: string;
  ctaLabel: string;
  footer: string;
};

export type EmailTemplateVariable = {
  key: string;
  label: string;
  defaultValue: string;
};

export type EmailTemplateDefinition = {
  id: EmailTemplateId;
  label: string;
  description: string;
  defaultContent: EmailTemplateContent;
  variables: readonly EmailTemplateVariable[];
};

export type RenderedEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type EmailTemplateProps = {
  content: EmailTemplateContent;
  values: Record<string, string>;
};

const productName = 'Next Template';

export const emailTemplateDefinitions: readonly EmailTemplateDefinition[] = [
  {
    id: 'accountVerification',
    label: 'Account verification',
    description:
      'Sent when a new account needs to confirm ownership of its email address.',
    defaultContent: {
      subject: 'Verify your email address',
      preview: 'Finish creating your account by verifying your email address.',
      heading: 'Verify your email address',
      body: 'Hi {{name}},\n\nFinish creating your account by confirming that this email address belongs to you.',
      ctaLabel: 'Verify email',
      footer:
        'If you did not create this account, you can ignore this message.',
    },
    variables: [
      { key: 'name', label: 'Recipient name', defaultValue: 'there' },
      {
        key: 'verificationUrl',
        label: 'Verification URL',
        defaultValue: 'https://example.com/verify-email?token=preview',
      },
    ],
  },
  {
    id: 'passwordReset',
    label: 'Password reset',
    description: 'Sent when a user requests a secure password reset link.',
    defaultContent: {
      subject: 'Reset your password',
      preview: 'Use the secure link to choose a new password.',
      heading: 'Reset your password',
      body: 'Use the secure link below to choose a new password for your account. This link expires in one hour.',
      ctaLabel: 'Choose a new password',
      footer:
        'If you did not request a password reset, you can ignore this message.',
    },
    variables: [
      {
        key: 'resetUrl',
        label: 'Reset URL',
        defaultValue: 'https://example.com/reset-password?token=preview',
      },
    ],
  },
  {
    id: 'loginOneTimePassword',
    label: 'Login one-time password',
    description:
      'Sent when a user requests a short-lived one-time password to sign in.',
    defaultContent: {
      subject: 'Your login code',
      preview: 'Use this one-time password to sign in.',
      heading: 'Your login code',
      body: 'Use this one-time password to sign in. It expires in 10 minutes.\n\n{{code}}',
      ctaLabel: '',
      footer: 'If you did not request this code, you can ignore this message.',
    },
    variables: [
      {
        key: 'code',
        label: 'One-time password',
        defaultValue: '123456',
      },
    ],
  },
  {
    id: 'newsletterWelcome',
    label: 'Newsletter welcome',
    description: 'Sent when a visitor subscribes to the newsletter.',
    defaultContent: {
      subject: 'You are subscribed to the newsletter',
      preview: 'Thanks for joining the newsletter.',
      heading: 'You are subscribed',
      body: 'Thanks for joining the newsletter. We will use this inbox for product updates, release notes, and feature announcements.',
      ctaLabel: 'Visit site',
      footer:
        'If this was not you, reply to this message and we can remove the subscription.',
    },
    variables: [
      {
        key: 'manageUrl',
        label: 'Manage URL',
        defaultValue: 'https://example.com',
      },
    ],
  },
  {
    id: 'adminMessage',
    label: 'Admin message',
    description:
      'A general-purpose email admins can customize and send to users.',
    defaultContent: {
      subject: 'A message from {{siteName}}',
      preview: 'An admin has sent you an update.',
      heading: 'Message from {{siteName}}',
      body: 'Hi {{name}},\n\n{{message}}',
      ctaLabel: 'Open workspace',
      footer:
        'You are receiving this because an administrator sent you an account update.',
    },
    variables: [
      { key: 'siteName', label: 'Site name', defaultValue: productName },
      { key: 'name', label: 'Recipient name', defaultValue: 'there' },
      {
        key: 'message',
        label: 'Message',
        defaultValue: 'Please review the latest workspace update.',
      },
      {
        key: 'actionUrl',
        label: 'Action URL',
        defaultValue: 'https://example.com/settings',
      },
    ],
  },
];

export const defaultEmailTemplateContents = Object.fromEntries(
  emailTemplateDefinitions.map((definition) => [
    definition.id,
    definition.defaultContent,
  ]),
) as Record<EmailTemplateId, EmailTemplateContent>;

export function isEmailTemplateId(value: string): value is EmailTemplateId {
  return (emailTemplateIds as readonly string[]).includes(value);
}

export function getEmailTemplateDefinition(templateId: EmailTemplateId) {
  return emailTemplateDefinitions.find(
    (definition) => definition.id === templateId,
  )!;
}

export function getDefaultEmailTemplateValues(templateId: EmailTemplateId) {
  const definition = getEmailTemplateDefinition(templateId);

  return Object.fromEntries(
    definition.variables.map((variable) => [
      variable.key,
      variable.defaultValue,
    ]),
  ) as Record<string, string>;
}

export function mergeEmailTemplateContent(
  templateId: EmailTemplateId,
  override: Partial<EmailTemplateContent> | null | undefined,
): EmailTemplateContent {
  return {
    ...defaultEmailTemplateContents[templateId],
    ...Object.fromEntries(
      Object.entries(override ?? {}).filter(
        (entry): entry is [keyof EmailTemplateContent, string] => {
          const [key, value] = entry;
          return (
            key in defaultEmailTemplateContents[templateId] &&
            typeof value === 'string'
          );
        },
      ),
    ),
  };
}

function interpolate(value: string, values: Record<string, string>) {
  return value.replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_match, key: string) => values[key] ?? '',
  );
}

function normalizeParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function resolveActionUrl(
  templateId: EmailTemplateId,
  values: Record<string, string>,
) {
  if (templateId === 'accountVerification') {
    return values.verificationUrl;
  }

  if (templateId === 'passwordReset') {
    return values.resetUrl;
  }

  if (templateId === 'loginOneTimePassword') {
    return '';
  }

  if (templateId === 'newsletterWelcome') {
    return values.manageUrl;
  }

  return values.actionUrl;
}

function EmailTemplate({ content, values }: EmailTemplateProps) {
  const bodyParagraphs = normalizeParagraphs(interpolate(content.body, values));
  const href = resolveActionUrl(
    (values.templateId ?? 'adminMessage') as EmailTemplateId,
    values,
  );

  return (
    <Html>
      <Head />
      <Preview>{interpolate(content.preview, values)}</Preview>
      <Body
        style={{
          margin: 0,
          backgroundColor: '#f4f4f5',
          fontFamily: 'Arial, sans-serif',
          color: '#18181b',
        }}
      >
        <Container
          style={{ margin: '0 auto', maxWidth: '640px', padding: '32px 16px' }}
        >
          <Section
            style={{
              border: '1px solid #e4e4e7',
              borderRadius: '24px',
              backgroundColor: '#ffffff',
              padding: '32px',
            }}
          >
            <Text
              style={{
                margin: '0 0 12px',
                fontSize: '12px',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: '#71717a',
              }}
            >
              {productName}
            </Text>
            <Heading
              style={{
                margin: '0 0 16px',
                fontSize: '30px',
                lineHeight: '1.2',
                color: '#09090b',
              }}
            >
              {interpolate(content.heading, values)}
            </Heading>
            {bodyParagraphs.map((paragraph) => (
              <Text
                key={paragraph}
                style={{
                  margin: '0 0 16px',
                  fontSize: '16px',
                  lineHeight: '1.7',
                  color: '#3f3f46',
                }}
              >
                {paragraph}
              </Text>
            ))}
            {href ? (
              <Button
                href={href}
                style={{
                  display: 'inline-block',
                  borderRadius: '9999px',
                  backgroundColor: '#18181b',
                  padding: '12px 20px',
                  color: '#fafafa',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {interpolate(content.ctaLabel, values)}
              </Button>
            ) : null}
            <Hr style={{ margin: '24px 0', borderColor: '#e4e4e7' }} />
            <Text
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: '1.7',
                color: '#52525b',
              }}
            >
              {interpolate(content.footer, values)}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderEmailTemplate(
  templateId: EmailTemplateId,
  inputValues: Record<string, string>,
  content = defaultEmailTemplateContents[templateId],
): Promise<RenderedEmailTemplate> {
  const values = {
    ...getDefaultEmailTemplateValues(templateId),
    ...inputValues,
    templateId,
  };
  const element = <EmailTemplate content={content} values={values} />;

  const [html, text] = await Promise.all([
    render(element, { pretty: true }),
    render(element, { plainText: true }),
  ]);

  return {
    subject: interpolate(content.subject, values),
    html,
    text,
  };
}

export async function createVerificationEmail(input: {
  verificationUrl: string;
  name?: string | null;
}) {
  return renderEmailTemplate('accountVerification', {
    verificationUrl: input.verificationUrl,
    name: input.name?.trim() || 'there',
  });
}

export async function createPasswordResetEmail(input: { resetUrl: string }) {
  return renderEmailTemplate('passwordReset', {
    resetUrl: input.resetUrl,
  });
}

export async function createLoginOneTimePasswordEmail(input: { code: string }) {
  return renderEmailTemplate('loginOneTimePassword', {
    code: input.code,
  });
}

export async function createNewsletterWelcomeEmail(input: {
  manageUrl: string;
}) {
  return renderEmailTemplate('newsletterWelcome', {
    manageUrl: input.manageUrl,
  });
}
