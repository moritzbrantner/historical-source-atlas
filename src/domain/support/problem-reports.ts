import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { problemReports } from '@/src/db/schema';

export const problemReportAreas = [
  'bug',
  'performance',
  'account',
  'billing',
  'other',
] as const;

export const problemReportStatuses = ['open', 'triaged', 'closed'] as const;

export type ProblemReportArea = (typeof problemReportAreas)[number];
export type ProblemReportStatus = (typeof problemReportStatuses)[number];

export type ProblemReportInput = {
  name?: string;
  email: string;
  area: string;
  pageUrl?: string;
  subject: string;
  details: string;
};

export type ProblemReportValidationResult =
  | {
      ok: true;
      value: {
        name: string | null;
        email: string;
        area: ProblemReportArea;
        pageUrl: string | null;
        subject: string;
        details: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function isValidOptionalUrl(value: string | null) {
  if (!value) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isProblemReportStatus(
  value: string | null | undefined,
): value is ProblemReportStatus {
  return problemReportStatuses.includes(value as ProblemReportStatus);
}

export function validateProblemReportInput(
  input: ProblemReportInput,
): ProblemReportValidationResult {
  const email = input.email.trim().toLowerCase();
  const area = input.area.trim();
  const pageUrl = normalizeOptional(input.pageUrl);
  const subject = input.subject.trim();
  const details = input.details.trim();

  if (
    !isValidEmail(email) ||
    !problemReportAreas.includes(area as ProblemReportArea) ||
    !isValidOptionalUrl(pageUrl) ||
    subject.length < 8 ||
    details.length < 30
  ) {
    return {
      ok: false,
      error:
        'Please complete the form with a valid email, category, subject, and enough detail to investigate.',
    };
  }

  return {
    ok: true,
    value: {
      name: normalizeOptional(input.name),
      email,
      area: area as ProblemReportArea,
      pageUrl,
      subject,
      details,
    },
  };
}

function createReferenceId() {
  return `PRB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createProblemReport(input: ProblemReportInput) {
  const validation = validateProblemReportInput(input);

  if (!validation.ok) {
    return validation;
  }

  const now = new Date();
  const [report] = await getDb()
    .insert(problemReports)
    .values({
      id: crypto.randomUUID(),
      referenceId: createReferenceId(),
      ...validation.value,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    ok: true as const,
    value: report,
  };
}

export async function listProblemReports(filters?: {
  status?: ProblemReportStatus;
  area?: ProblemReportArea;
}) {
  const conditions = [
    filters?.status ? eq(problemReports.status, filters.status) : undefined,
    filters?.area ? eq(problemReports.area, filters.area) : undefined,
  ].filter(Boolean);

  return getDb().query.problemReports.findMany({
    where: conditions.length ? () => and(...conditions) : undefined,
    orderBy: [desc(problemReports.createdAt)],
    limit: 100,
  });
}

export async function getProblemReportById(reportId: string) {
  return (
    (await getDb().query.problemReports.findFirst({
      where: (table, { eq: equals }) => equals(table.id, reportId),
    })) ?? null
  );
}

export async function updateProblemReport(input: {
  reportId: string;
  status: ProblemReportStatus;
  adminNote?: string | null;
}) {
  const now = new Date();
  const [report] = await getDb()
    .update(problemReports)
    .set({
      status: input.status,
      adminNote: normalizeOptional(input.adminNote ?? undefined),
      closedAt: input.status === 'closed' ? now : null,
      updatedAt: now,
    })
    .where(eq(problemReports.id, input.reportId))
    .returning();

  return report ?? null;
}
