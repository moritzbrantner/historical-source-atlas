import type { AppRole } from '@/lib/authorization';
import { and, asc, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { notifications, pageVisits, userFollows, users } from '@/src/db/schema';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';
import { buildProfileImageUrl } from '@/src/profile/object-storage';

export type NotificationStatus = 'unread' | 'read';
export type NotificationAudience = 'user' | 'role' | 'all';
export type NotificationRoleTarget = AppRole | 'ALL';
export type AdminUserStatus = 'active' | 'pending' | 'suspended' | 'disabled';

export type NotificationFeedItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  status: NotificationStatus;
  createdAt: string;
};

export type NotificationPreview = {
  unreadCount: number;
  items: NotificationFeedItem[];
};

export type NotificationsPageData = NotificationPreview & {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type AdminUsersPageData = {
  metrics: {
    privileged: number;
    operational: number;
    member: number;
  };
};

export type AdminUserListItem = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
  status: AdminUserStatus;
  createdAt: string;
  lastActivityAt: string | null;
  totalNotifications: number;
  unreadNotifications: number;
};

export type AdminUserSearchResult = AdminUserListItem;

export type AdminUserDetail = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
  status: AdminUserStatus;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt: string | null;
  lockoutUntil: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  disabledById: string | null;
  lockoutClearedAt: string | null;
  timezone: string | null;
  locale: string | null;
  bio: string | null;
  followerCount: number;
  visitCount: number;
  totalNotifications: number;
  unreadNotifications: number;
  lastActivityAt: string | null;
  recentActivity: Array<{
    id: string;
    pathname: string;
    href: string;
    visitedAt: string;
  }>;
  recentNotifications: NotificationFeedItem[];
};

export type SendAdminNotificationInput = {
  audience: NotificationAudience;
  targetUserId?: string;
  targetRole?: NotificationRoleTarget;
  title: string;
  body: string;
  href?: string;
};

export type NotificationError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND';
  message: string;
};

type UserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  image: string | null;
  emailVerified: Date | null;
  lockoutUntil: Date | null;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function resolveDisplayName(user: Pick<UserRecord, 'name' | 'email'>) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  return emailPrefix || 'User';
}

function resolveUserStatus(
  user: Pick<UserRecord, 'emailVerified' | 'lockoutUntil' | 'disabledAt'>,
): AdminUserStatus {
  if (user.disabledAt) {
    return 'disabled';
  }

  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    return 'suspended';
  }

  if (!user.emailVerified) {
    return 'pending';
  }

  return 'active';
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toRequiredIsoString(value: Date | string) {
  const isoString = toIsoString(value);

  if (!isoString) {
    throw new Error('Expected valid date value.');
  }

  return isoString;
}

async function getLatestVisitMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Date>();
  }

  const latestVisits = await getDb()
    .select({
      userId: pageVisits.userId,
      visitedAt: sql<Date>`max(${pageVisits.visitedAt})`,
    })
    .from(pageVisits)
    .where(inArray(pageVisits.userId, userIds))
    .groupBy(pageVisits.userId);

  return new Map(
    latestVisits
      .filter((visit) => visit.visitedAt instanceof Date)
      .map((visit) => [visit.userId, visit.visitedAt]),
  );
}

async function getNotificationCountMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { total: number; unread: number }>();
  }

  const [totals, unread] = await Promise.all([
    getDb()
      .select({
        userId: notifications.userId,
        value: count(),
      })
      .from(notifications)
      .where(inArray(notifications.userId, userIds))
      .groupBy(notifications.userId),
    getDb()
      .select({
        userId: notifications.userId,
        value: count(),
      })
      .from(notifications)
      .where(
        and(
          inArray(notifications.userId, userIds),
          eq(notifications.status, 'unread'),
        ),
      )
      .groupBy(notifications.userId),
  ]);

  const counts = new Map<string, { total: number; unread: number }>();

  for (const item of totals) {
    counts.set(item.userId, { total: item.value, unread: 0 });
  }

  for (const item of unread) {
    const current = counts.get(item.userId) ?? { total: 0, unread: 0 };
    counts.set(item.userId, { ...current, unread: item.value });
  }

  return counts;
}

function mapNotificationFeedItem(item: {
  id: string;
  title: string;
  body: string;
  href: string | null;
  status: NotificationStatus;
  createdAt: Date;
}): NotificationFeedItem {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    href: item.href,
    status: item.status,
    createdAt: toRequiredIsoString(item.createdAt),
  };
}

export async function getNotificationPreviewUseCase(
  userId: string,
  limit = 3,
): Promise<NotificationPreview> {
  const [items, unreadCountResult] = await Promise.all([
    getDb().query.notifications.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
      orderBy: (table, { desc: innerDesc }) => [innerDesc(table.createdAt)],
      limit,
    }),
    getDb()
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.status, 'unread'),
        ),
      ),
  ]);

  return {
    unreadCount: unreadCountResult[0]?.value ?? 0,
    items: items.map(mapNotificationFeedItem),
  };
}

export async function getNotificationsPageDataUseCase(
  userId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<NotificationsPageData> {
  const pageSize = Math.min(
    Math.max(Math.trunc(options.pageSize ?? 20), 1),
    100,
  );
  const requestedPage = Math.max(Math.trunc(options.page ?? 1), 1);

  const [totalCountResult, unreadCountResult] = await Promise.all([
    getDb()
      .select({ value: count() })
      .from(notifications)
      .where(eq(notifications.userId, userId)),
    getDb()
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.status, 'unread'),
        ),
      ),
  ]);

  const totalCount = totalCountResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items =
    totalCount > 0
      ? await getDb().query.notifications.findMany({
          where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
          orderBy: (table, { desc: innerDesc }) => [innerDesc(table.createdAt)],
          limit: pageSize,
          offset: (page - 1) * pageSize,
        })
      : [];

  return {
    unreadCount: unreadCountResult[0]?.value ?? 0,
    items: items.map(mapNotificationFeedItem),
    totalCount,
    page,
    pageSize,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export async function markAllNotificationsReadUseCase(userId: string) {
  await getDb()
    .update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.status, 'unread')),
    );

  return success({ updated: true });
}

export async function markNotificationReadUseCase(
  userId: string,
  notificationId: string,
): Promise<ServiceResult<{ updated: boolean }, NotificationError>> {
  const updatedNotifications = await getDb()
    .update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.status, 'unread'),
      ),
    )
    .returning({ id: notifications.id });

  if (updatedNotifications.length > 0) {
    return success({ updated: true });
  }

  const existingNotification = await getDb().query.notifications.findFirst({
    where: (table, { and: innerAnd, eq: innerEq }) =>
      innerAnd(
        innerEq(table.id, notificationId),
        innerEq(table.userId, userId),
      ),
    columns: {
      id: true,
    },
  });

  if (!existingNotification) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Notification not found.',
    });
  }

  return success({ updated: false });
}

export async function getAdminUsersPageDataUseCase(): Promise<AdminUsersPageData> {
  const [privilegedCount, operationalCount, memberCount] = await Promise.all([
    getDb()
      .select({ value: count() })
      .from(users)
      .where(inArray(users.role, ['ADMIN', 'SUPERADMIN'])),
    getDb()
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'MANAGER')),
    getDb()
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'USER')),
  ]);

  return {
    metrics: {
      privileged: privilegedCount[0]?.value ?? 0,
      operational: operationalCount[0]?.value ?? 0,
      member: memberCount[0]?.value ?? 0,
    },
  };
}

export async function searchAdminUsersUseCase(
  query: string,
  limit = 12,
): Promise<AdminUserSearchResult[]> {
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.startsWith('@')
    ? trimmedQuery.slice(1).trim()
    : trimmedQuery;
  const resultLimit = Math.min(Math.max(Math.trunc(limit), 1), 25);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const pattern = `%${normalizedQuery}%`;
  const idPattern = `%${trimmedQuery}%`;

  const userRecords = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      image: users.image,
      emailVerified: users.emailVerified,
      lockoutUntil: users.lockoutUntil,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(
      or(
        ilike(users.name, pattern),
        ilike(users.email, pattern),
        ilike(users.tag, pattern),
        ilike(users.id, idPattern),
      ),
    )
    .orderBy(asc(users.name), asc(users.email), asc(users.id))
    .limit(resultLimit);

  const userIds = userRecords.map((user) => user.id);
  const [latestVisitMap, notificationCountMap] = await Promise.all([
    getLatestVisitMap(userIds),
    getNotificationCountMap(userIds),
  ]);

  const rows = userRecords
    .map<AdminUserListItem>((user) => {
      const counts = notificationCountMap.get(user.id) ?? {
        total: 0,
        unread: 0,
      };

      return {
        id: user.id,
        displayName: resolveDisplayName(user),
        email: user.email ?? 'No email',
        role: user.role,
        status: resolveUserStatus(user),
        createdAt: toRequiredIsoString(user.createdAt),
        lastActivityAt: toIsoString(latestVisitMap.get(user.id)),
        totalNotifications: counts.total,
        unreadNotifications: counts.unread,
      };
    })
    .sort((left, right) => {
      const leftActivity = left.lastActivityAt
        ? new Date(left.lastActivityAt).getTime()
        : 0;
      const rightActivity = right.lastActivityAt
        ? new Date(right.lastActivityAt).getTime()
        : 0;
      return (
        rightActivity - leftActivity ||
        left.displayName.localeCompare(right.displayName)
      );
    });

  return rows;
}

export async function getAdminUserDetailUseCase(
  userId: string,
): Promise<AdminUserDetail | null> {
  const [
    user,
    profile,
    followerCountResult,
    visitCountResult,
    lastActivityResult,
    notificationCounts,
    recentActivity,
    recentNotifications,
  ] = await Promise.all([
    getDb().query.users.findFirst({
      where: (table, { eq: innerEq }) => innerEq(table.id, userId),
    }),
    getDb().query.profiles.findFirst({
      where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
    }),
    getDb()
      .select({ value: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId)),
    getDb()
      .select({ value: count() })
      .from(pageVisits)
      .where(eq(pageVisits.userId, userId)),
    getDb()
      .select({ value: sql<Date>`max(${pageVisits.visitedAt})` })
      .from(pageVisits)
      .where(eq(pageVisits.userId, userId)),
    getNotificationCountMap([userId]),
    getDb().query.pageVisits.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
      orderBy: (table, { desc: innerDesc }) => [innerDesc(table.visitedAt)],
      limit: 6,
    }),
    getDb().query.notifications.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
      orderBy: (table, { desc: innerDesc }) => [innerDesc(table.createdAt)],
      limit: 8,
    }),
  ]);

  if (!user) {
    return null;
  }

  const notificationSummary = notificationCounts.get(userId) ?? {
    total: 0,
    unread: 0,
  };

  return {
    id: user.id,
    displayName: resolveDisplayName(user),
    email: user.email ?? 'No email',
    role: user.role,
    status: resolveUserStatus(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
    createdAt: toRequiredIsoString(user.createdAt),
    updatedAt: toRequiredIsoString(user.updatedAt),
    emailVerifiedAt: toIsoString(user.emailVerified),
    lockoutUntil: toIsoString(user.lockoutUntil),
    disabledAt: toIsoString(user.disabledAt),
    disabledReason: user.disabledReason ?? null,
    disabledById: user.disabledById ?? null,
    lockoutClearedAt: toIsoString(user.lockoutClearedAt),
    timezone: profile?.timezone ?? null,
    locale: profile?.locale ?? null,
    bio: profile?.bio ?? null,
    followerCount: followerCountResult[0]?.value ?? 0,
    visitCount: visitCountResult[0]?.value ?? 0,
    totalNotifications: notificationSummary.total,
    unreadNotifications: notificationSummary.unread,
    lastActivityAt: toIsoString(lastActivityResult[0]?.value ?? null),
    recentActivity: recentActivity.map((item) => ({
      id: item.id,
      pathname: item.pathname,
      href: item.href,
      visitedAt: toRequiredIsoString(item.visitedAt),
    })),
    recentNotifications: recentNotifications.map(mapNotificationFeedItem),
  };
}

async function resolveTargetUserIds(
  input: SendAdminNotificationInput,
): Promise<string[]> {
  if (input.audience === 'user') {
    if (!input.targetUserId) {
      return [];
    }

    const targetUserId = input.targetUserId;
    const user = await getDb().query.users.findFirst({
      where: (table, { eq: innerEq }) => innerEq(table.id, targetUserId),
    });

    return user ? [user.id] : [];
  }

  if (input.audience === 'role') {
    if (!input.targetRole || input.targetRole === 'ALL') {
      return [];
    }

    const targetRole = input.targetRole;
    const roleRecipients = await getDb().query.users.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.role, targetRole),
      columns: { id: true },
    });

    return roleRecipients.map((user) => user.id);
  }

  const allRecipients = await getDb().query.users.findMany({
    columns: { id: true },
  });

  return allRecipients.map((user) => user.id);
}

function validateNotificationInput(
  input: SendAdminNotificationInput,
): NotificationError | null {
  const title = input.title.trim();
  const body = input.body.trim();
  const href = input.href?.trim();

  if (title.length < 3 || title.length > 120) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Notification titles must be between 3 and 120 characters.',
    };
  }

  if (body.length < 5 || body.length > 500) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Notification messages must be between 5 and 500 characters.',
    };
  }

  if (href && !href.startsWith('/')) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Notification links must start with "/".',
    };
  }

  if (input.audience === 'user' && !input.targetUserId) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Choose a user to notify.',
    };
  }

  if (
    input.audience === 'role' &&
    (!input.targetRole || input.targetRole === 'ALL')
  ) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Choose a role group to notify.',
    };
  }

  return null;
}

export async function sendAdminNotificationUseCase(
  actorUserId: string,
  input: SendAdminNotificationInput,
): Promise<ServiceResult<{ recipientCount: number }, NotificationError>> {
  const validationError = validateNotificationInput(input);

  if (validationError) {
    return failure(validationError);
  }

  const targetUserIds = [...new Set(await resolveTargetUserIds(input))];

  if (targetUserIds.length === 0) {
    return failure({
      code: 'NOT_FOUND',
      message: 'No matching recipients were found.',
    });
  }

  const now = new Date();
  const title = input.title.trim();
  const body = input.body.trim();
  const href = input.href?.trim() || null;
  const audienceValue =
    input.audience === 'user'
      ? (input.targetUserId ?? null)
      : input.audience === 'role'
        ? (input.targetRole ?? null)
        : 'ALL';

  await getDb()
    .insert(notifications)
    .values(
      targetUserIds.map((userId) => ({
        id: crypto.randomUUID(),
        userId,
        actorId: actorUserId,
        title,
        body,
        href,
        audience: input.audience,
        audienceValue,
        createdAt: now,
      })),
    );

  return success({
    recipientCount: targetUserIds.length,
  });
}
