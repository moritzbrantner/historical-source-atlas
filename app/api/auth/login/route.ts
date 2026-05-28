import * as z from 'zod';

import { authorizeCredentialsDetailed } from '@/src/auth/credentials';
import { signInSession } from '@/src/auth.server';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

const loginBodySchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const POST = createApiRoute({
  action: 'auth.login',
  bodySchema: loginBodySchema,
  async handler({ request, body }) {
    const result = await authorizeCredentialsDetailed(
      {
        email: body.email,
        password: body.password,
      },
      undefined,
      request,
    );

    if (!result.ok) {
      if (result.reason === 'email_unverified') {
        throw new ProblemError(
          problem(
            '/problems/email-unverified',
            'Email verification required',
            403,
            'Please verify your email address before logging in.',
          ),
        );
      }

      throw new ProblemError(
        problem(
          '/problems/invalid-credentials',
          'Invalid credentials',
          401,
          'Email or password is incorrect.',
        ),
      );
    }

    const { user } = result;

    if (!user.email) {
      throw new ProblemError(
        problem(
          '/problems/invalid-credentials',
          'Invalid credentials',
          401,
          'Email or password is incorrect.',
        ),
      );
    }

    await signInSession({
      id: user.id,
      email: user.email,
      tag: user.tag,
      image: user.image ?? null,
      bannerImage: user.bannerImage ?? null,
      name: user.name ?? null,
      role: user.role,
    });

    return { ok: true };
  },
});
