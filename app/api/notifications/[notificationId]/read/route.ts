import { markNotificationReadUseCase } from '@/src/domain/notifications/use-cases';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'notifications.markItemRead',
  permission: 'notifications.readOwn',
  async handler({ actorId, routeContext }) {
    const { params } = routeContext as {
      params: Promise<{ notificationId: string }>;
    };
    const { notificationId } = await params;

    if (!notificationId.trim()) {
      return Response.json(
        { error: 'Notification not found.' },
        { status: 404 },
      );
    }

    const result = await markNotificationReadUseCase(actorId!, notificationId);

    if (!result.ok) {
      return Response.json({ error: result.error.message }, { status: 404 });
    }

    return { ok: true, updated: result.data.updated };
  },
});
