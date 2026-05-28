import { signInSession } from '@/src/auth.server';
import {
  updateAccountEmailUseCase,
  type AccountError,
} from '@/src/domain/account/use-cases';
import { createApiRoute } from '@/src/http/route';

function statusForAccountError(error: AccountError) {
  switch (error.code) {
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    default:
      return 400;
  }
}

export const POST = createApiRoute({
  action: 'account.updateEmail',
  permission: 'account.updateOwnEmail',
  async handler({ request, session }) {
    const activeSession = session!;
    const userId = activeSession.user.id;
    const formData = await request.formData();
    const rawEmail = formData.get('email');
    const rawCurrentPassword = formData.get('currentPassword');
    const email = typeof rawEmail === 'string' ? rawEmail : '';
    const currentPassword =
      typeof rawCurrentPassword === 'string' ? rawCurrentPassword : '';

    try {
      const result = await updateAccountEmailUseCase(userId, {
        email,
        currentPassword,
      });

      if (!result.ok) {
        return Response.json(
          { error: result.error.message },
          { status: statusForAccountError(result.error) },
        );
      }

      await signInSession({
        ...activeSession.user,
        email: result.data.email,
      });

      return { ok: true };
    } catch {
      return Response.json(
        {
          error:
            'Unable to update your email address right now. Please try again.',
        },
        { status: 500 },
      );
    }
  },
});
