import { getEnv } from '@/src/config/env';
import { getLogger } from '@/src/observability/logger';

export type SendEmailRequest = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  tags?: string[];
};

function getEmailProvider() {
  return getEnv().email.provider;
}

function getEmailFromAddress() {
  return getEnv().email.from;
}

function htmlToText(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function sendEmail(request: SendEmailRequest): Promise<void> {
  const provider = getEmailProvider();
  const from = request.from ?? getEmailFromAddress();

  if (provider === 'console') {
    getLogger({ subsystem: 'email' }).info(
      {
        from,
        to: request.to,
        subject: request.subject,
        html: request.html,
      },
      'Simulated email send',
    );
    return;
  }

  if (provider === 'mailpit') {
    const response = await fetch(
      `${getEnv().email.mailpitBaseUrl}/api/v1/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: {
            Email: from,
            Name: request.fromName,
          },
          To: [{ Email: request.to }],
          Subject: request.subject,
          HTML: request.html,
          Text: request.text ?? htmlToText(request.html),
          Tags: request.tags,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Mailpit send failed with status ${response.status}.`);
    }

    return;
  }

  if (provider === 'smtp') {
    const { createTransport } = await import('nodemailer');
    const smtp = getEnv().email.smtp;

    if (!smtp.host || !smtp.port || !smtp.user || !smtp.password) {
      throw new Error(
        'SMTP email provider is selected, but SMTP configuration is incomplete.',
      );
    }

    const transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
    });

    await transporter.sendMail({
      from: request.fromName ? `${request.fromName} <${from}>` : from,
      to: request.to,
      subject: request.subject,
      html: request.html,
      text: request.text ?? htmlToText(request.html),
      headers: request.tags?.length
        ? {
            'X-Email-Tags': request.tags.join(','),
          }
        : undefined,
    });

    return;
  }

  throw new Error(`Unsupported EMAIL_PROVIDER "${provider}".`);
}
