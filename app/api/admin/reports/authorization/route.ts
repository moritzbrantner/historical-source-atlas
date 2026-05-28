import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { createApiRoute } from '@/src/http/route';

export const GET = createApiRoute({
  action: 'admin.reports.authorization',
  featureKey: 'admin.reports',
  permission: 'admin.reports.read',
  async handler({ session }) {
    return {
      action: 'viewReports',
      allowed: await hasPermissionForRole(
        session!.user.role,
        'admin.reports.read',
      ),
    };
  },
});
