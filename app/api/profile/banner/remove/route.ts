import { signInSession } from '@/src/auth.server';
import { removeProfileBannerImageUseCase } from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'profile.removeBannerImage',
  auth: true,
  permission: 'profile.manageOwnImage',
  async handler({ actorId, session }) {
    const result = await removeProfileBannerImageUseCase(actorId!);

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/profile-banner-image-remove',
          'Unable to remove profile banner',
          400,
          result.error.message,
        ),
      );
    }

    await signInSession({
      ...session!.user,
      bannerImage: null,
    });

    return { ok: true };
  },
});
