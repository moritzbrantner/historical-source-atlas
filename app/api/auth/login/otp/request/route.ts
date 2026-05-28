import * as z from 'zod';

import { requestLoginOneTimePassword } from '@/src/auth/account-lifecycle';
import { createApiRoute } from '@/src/http/route';

const requestLoginOtpBodySchema = z.object({
  email: z.string().min(1),
  locale: z.string().optional(),
});

export const POST = createApiRoute({
  action: 'auth.login.otp.request',
  bodySchema: requestLoginOtpBodySchema,
  async handler({ body }) {
    await requestLoginOneTimePassword(body.email, { locale: body.locale });
    return { ok: true };
  },
});
