export type AtlasSourceTagGroup = {
  sourceId: string;
  tags: string[];
};

export type AtlasSourceTagsResponse = {
  authenticated: boolean;
  tags: AtlasSourceTagGroup[];
};

export type NormalizeAtlasSourceTagsResult =
  | {
      ok: true;
      tags: string[];
    }
  | {
      ok: false;
      message: string;
    };

export const maxAtlasSourceTagsPerObject = 10;
export const maxAtlasSourceTagLength = 32;

const sourceIdPattern = /^[a-z0-9][a-z0-9-]{0,120}$/;
const tagPattern = /^[\p{L}\p{N}][\p{L}\p{N}_ -]*$/u;

export function isValidAtlasSourceId(sourceId: string) {
  return sourceIdPattern.test(sourceId);
}

export function normalizeAtlasSourceTagInput(input: string) {
  return input.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeAtlasSourceTags(
  rawTags: readonly string[],
): NormalizeAtlasSourceTagsResult {
  const tags: string[] = [];

  for (const rawTag of rawTags) {
    const tag = normalizeAtlasSourceTagInput(rawTag);

    if (!tag) {
      continue;
    }

    if (tag.length > maxAtlasSourceTagLength) {
      return {
        ok: false,
        message: `Tags must be ${maxAtlasSourceTagLength} characters or fewer.`,
      };
    }

    if (!tagPattern.test(tag)) {
      return {
        ok: false,
        message:
          'Tags can use letters, numbers, spaces, hyphens, and underscores.',
      };
    }

    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  if (tags.length > maxAtlasSourceTagsPerObject) {
    return {
      ok: false,
      message: `Use ${maxAtlasSourceTagsPerObject} tags or fewer per object.`,
    };
  }

  return {
    ok: true,
    tags,
  };
}

export function parseAtlasSourceTagInput(input: string) {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function groupAtlasSourceTags(
  rows: readonly { sourceId: string; tag: string }[],
): AtlasSourceTagGroup[] {
  const groupedTags = new Map<string, string[]>();

  for (const row of rows) {
    const tags = groupedTags.get(row.sourceId) ?? [];
    tags.push(row.tag);
    groupedTags.set(row.sourceId, tags);
  }

  return Array.from(groupedTags.entries()).map(([sourceId, tags]) => ({
    sourceId,
    tags,
  }));
}
