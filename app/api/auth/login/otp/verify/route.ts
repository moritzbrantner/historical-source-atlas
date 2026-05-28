import {
  buildCredentialThrottleKey,
  clearCredentialAttemptFailures,
  getClientIpFromRequest,
  isCredentialAttemptThrottled,
  registerCredentialAttemptFailure,
} from '@/src/auth/credential-security';
import { verifyLoginOneTimePassword } from '@/src/auth/account-lifecycle';
import { signInSession } from '@/src/auth.server';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';
import * as z from 'zod';

const verifyLoginOtpBodySchema = z.object({
  email: z.string().min(1),
  code: z.string().min(1),
});

export const POST = createApiRoute({
  action: 'auth.login.otp.verify',
  bodySchema: verifyLoginOtpBodySchema,
  async handler({ request, body }) {
    const normalizedEmail = body.email.trim().toLowerCase();
    const throttleKey = buildCredentialThrottleKey(
      `login-otp:${normalizedEmail}`,
      getClientIpFromRequest(request),
    );

    if (isCredentialAttemptThrottled(throttleKey)) {
      throw new ProblemError(
        problem(
          '/problems/invalid-login-otp',
          'Invalid one-time password',
          401,
          'The one-time password is invalid or has expired.',
        ),
      );
    }

    const result = await verifyLoginOneTimePassword(body.email, body.code);

    if (!result.ok) {
      registerCredentialAttemptFailure(throttleKey);
      throw new ProblemError(
        problem(
          '/problems/invalid-login-otp',
          'Invalid one-time password',
          401,
          result.error,
        ),
      );
    }

    clearCredentialAttemptFailures(throttleKey);
    await signInSession(result.user);

    return { ok: true };
  },
});
