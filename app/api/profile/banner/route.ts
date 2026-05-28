import * as z from 'zod';

import { signInSession } from '@/src/auth.server';
import { updateProfileBannerImageUseCase } from '@/src/domain/profile/use-cases';
import { getLogger } from '@/src/observability/logger';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'profile.updateBannerImage',
  auth: true,
  permission: 'profile.manageOwnImage',
  bodySchema: z.object({
    image: z.instanceof(File),
  }),
  async handler({ body, session, actorId }) {
    try {
      const result = await updateProfileBannerImageUseCase(
        actorId!,
        body.image,
      );

      if (!result.ok) {
        throw new ProblemError(
          problem(
            '/problems/profile-banner-image',
            'Unable to update profile banner',
            400,
            result.error.message,
          ),
        );
      }

      await signInSession({
        ...session!.user,
        bannerImage: result.data.imageUrl,
      });

      return { ok: true };
    } catch (error) {
      getLogger({ subsystem: 'profile' }).error(
        { err: error },
        'Profile banner upload failed',
      );
      throw error;
    }
  },
});
