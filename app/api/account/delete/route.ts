import { signOutSession } from '@/src/auth.server';
import {
  deleteAccountUseCase,
  type AccountError,
} from '@/src/domain/account/use-cases';
import { createApiRoute } from '@/src/http/route';

function statusForAccountError(error: AccountError) {
  switch (error.code) {
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    default:
      return 400;
  }
}

export const POST = createApiRoute({
  action: 'account.delete',
  permission: 'account.deleteOwn',
  async handler({ request, session }) {
    const userId = session!.user.id;
    const formData = await request.formData();
    const rawCurrentPassword = formData.get('currentPassword');
    const currentPassword =
      typeof rawCurrentPassword === 'string' ? rawCurrentPassword : '';

    try {
      const result = await deleteAccountUseCase(userId, { currentPassword });

      if (!result.ok) {
        return Response.json(
          { error: result.error.message },
          { status: statusForAccountError(result.error) },
        );
      }

      await signOutSession();
      return { ok: true };
    } catch {
      return Response.json(
        { error: 'Unable to delete your account right now. Please try again.' },
        { status: 500 },
      );
    }
  },
});
