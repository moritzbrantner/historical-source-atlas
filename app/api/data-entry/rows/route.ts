import { getDb } from '@/src/db/client';
import {
  profiles,
  securityAuditLogs,
  securityRateLimitCounters,
  users,
} from '@/src/db/schema';
import { canWriteTable } from '@/src/domain/data-entry/table-permissions';
import { isManagedTable } from '@/src/domain/data-entry/use-cases';
import { createApiRoute } from '@/src/http/route';
import { getFallbackProfileTag } from '@/src/profile/tags';

export const POST = createApiRoute({
  action: 'admin.dataEntry.createRow',
  featureKey: 'admin.dataStudio',
  roles: ['SUPERADMIN'],
  permission: 'admin.dataStudio.write',
  async handler({ request, session }) {
    const userId = session!.user.id;
    const role = session!.user.role;
    const formData = await request.formData();
    const rawTable = formData.get('table');

    if (typeof rawTable !== 'string' || !isManagedTable(rawTable)) {
      return Response.json(
        { error: 'A target table is required.' },
        { status: 400 },
      );
    }

    const table = rawTable;

    if (!canWriteTable(role, table)) {
      return Response.json(
        { error: `Your role does not have write access to ${table}.` },
        { status: 403 },
      );
    }

    const db = getDb();

    try {
      if (table === 'Profile') {
        const bio = toNullableString(formData.get('bio'));
        const locale = toNullableString(formData.get('locale'));
        const timezone = toNullableString(formData.get('timezone'));

        await db.insert(profiles).values({
          id: crypto.randomUUID(),
          userId,
          bio,
          locale,
          timezone,
        });

        return { success: 'Profile row created.' };
      }

      if (table === 'User') {
        const email = toNullableString(formData.get('email'));
        const name = toNullableString(formData.get('name'));
        const newRole = formData.get('role');
        const normalizedRole = newRole === 'ADMIN' ? 'ADMIN' : 'USER';

        if (!email) {
          return Response.json(
            { error: 'Email is required for User rows.' },
            { status: 400 },
          );
        }

        const newUserId = crypto.randomUUID();

        await db.insert(users).values({
          id: newUserId,
          email,
          tag: getFallbackProfileTag(newUserId),
          name,
          role: normalizedRole,
        });

        return { success: 'User row created.' };
      }

      if (table === 'SecurityAuditLog') {
        const action = toNullableString(formData.get('action'));
        const outcome = toNullableString(formData.get('outcome'));
        const statusCode = Number(formData.get('statusCode'));
        const metadata = toNullableString(formData.get('metadata'));

        if (!action || !outcome || Number.isNaN(statusCode)) {
          return Response.json(
            {
              error: 'Action, outcome, and a numeric status code are required.',
            },
            { status: 400 },
          );
        }

        const parsedMetadata = parseMetadata(metadata);
        if (!parsedMetadata.ok) {
          return Response.json(
            { error: parsedMetadata.error },
            { status: 400 },
          );
        }

        await db.insert(securityAuditLogs).values({
          id: crypto.randomUUID(),
          actorId: userId,
          action,
          outcome,
          statusCode,
          metadata: parsedMetadata.value,
        });

        return { success: 'SecurityAuditLog row created.' };
      }

      if (table === 'SecurityRateLimitCounter') {
        const key = toNullableString(formData.get('key'));
        const count = Number(formData.get('count'));
        const resetAtRaw = toNullableString(formData.get('resetAt'));

        if (!key || Number.isNaN(count) || !resetAtRaw) {
          return Response.json(
            { error: 'Key, count, and resetAt are required.' },
            { status: 400 },
          );
        }

        const resetAt = new Date(resetAtRaw);
        if (Number.isNaN(resetAt.getTime())) {
          return Response.json(
            { error: 'resetAt must be a valid date.' },
            { status: 400 },
          );
        }

        await db.insert(securityRateLimitCounters).values({
          key,
          count,
          resetAt,
        });

        return { success: 'SecurityRateLimitCounter row created.' };
      }

      return Response.json({ error: 'Unsupported table.' }, { status: 400 });
    } catch {
      return Response.json(
        { error: 'Unable to insert row. Check values and constraints.' },
        { status: 500 },
      );
    }
  },
});

function toNullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMetadata(
  rawMetadata: string | null,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (!rawMetadata) {
    return { ok: true, value: {} };
  }

  try {
    const parsed = JSON.parse(rawMetadata) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Metadata must be a JSON object.' };
    }

    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Metadata must be valid JSON.' };
  }
}
