import * as z from 'zod';

import { signUpWithCredentials } from '@/src/auth/account-lifecycle';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const signupBodySchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  name: z.string().trim().optional(),
  locale: z.string().optional(),
});

export const POST = createApiRoute({
  action: 'account.signup',
  featureKey: 'account.register',
  bodySchema: signupBodySchema,
  async handler({ body }) {
    const result = await signUpWithCredentials(body);

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/account-signup',
          'Unable to create account',
          400,
          result.error,
        ),
      );
    }

    return { ok: true, requiresEmailVerification: true };
  },
});
