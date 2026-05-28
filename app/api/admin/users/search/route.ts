import * as z from 'zod';

import { searchAdminUsersUseCase } from '@/src/domain/notifications/use-cases';
import { createApiRoute } from '@/src/http/route';

const searchQuerySchema = z.object({
  query: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});

export const GET = createApiRoute({
  action: 'admin.users.search',
  auth: true,
  featureKey: 'admin.users',
  permission: 'admin.users.read',
  querySchema: searchQuerySchema,
  async handler({ query }) {
    const users = await searchAdminUsersUseCase(
      query.query ?? '',
      query.limit ?? 12,
    );

    return {
      ok: true,
      users,
    };
  },
});
