import {
  normalizeAtlasSourceTagInput,
  normalizeAtlasSourceTags,
} from '../../source-tags/model/sourceTags';

export type AtlasCollectionItem = {
  note: string | null;
  sortOrder: number;
  sourceId: string;
};

export type AtlasCollection = {
  id: string;
  isPublic: boolean;
  items: AtlasCollectionItem[];
  name: string;
  notes: string | null;
  shareSlug: string;
  tag: string;
};

export type AtlasCollectionsResponse = {
  authenticated: boolean;
  collections: AtlasCollection[];
};

export type NormalizeAtlasCollectionResult =
  | {
      ok: true;
      name: string;
      notes: string | null;
      tag: string;
    }
  | {
      ok: false;
      message: string;
    };

export type NormalizeAtlasCollectionItemNoteResult =
  | {
      ok: true;
      note: string | null;
    }
  | {
      ok: false;
      message: string;
    };

export const maxAtlasCollectionNameLength = 80;
export const maxAtlasCollectionNotesLength = 1200;
export const maxAtlasCollectionItemNoteLength = 600;
export const maxAtlasCollectionItems = 100;

export function normalizeAtlasCollection(input: {
  name: string;
  notes?: string | null;
}): NormalizeAtlasCollectionResult {
  const name = input.name.trim().replace(/\s+/g, ' ');

  if (!name) {
    return {
      ok: false,
      message: 'Collection name is required.',
    };
  }

  if (name.length > maxAtlasCollectionNameLength) {
    return {
      ok: false,
      message: `Collection names must be ${maxAtlasCollectionNameLength} characters or fewer.`,
    };
  }

  const normalizedTags = normalizeAtlasSourceTags([name]);

  if (!normalizedTags.ok) {
    return {
      ok: false,
      message: normalizedTags.message.replace('Tags', 'Collection names'),
    };
  }

  const notes = normalizeAtlasCollectionNotes(input.notes);

  if (notes.length > maxAtlasCollectionNotesLength) {
    return {
      ok: false,
      message: `Collection notes must be ${maxAtlasCollectionNotesLength} characters or fewer.`,
    };
  }

  const tag = normalizeAtlasSourceTagInput(name);

  return {
    ok: true,
    name,
    notes: notes || null,
    tag,
  };
}

export function normalizeAtlasCollectionNotes(notes?: string | null) {
  return (notes ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeAtlasCollectionItemNote(
  note?: string | null,
): NormalizeAtlasCollectionItemNoteResult {
  const normalizedNote = (note ?? '').trim().replace(/\s+/g, ' ');

  if (normalizedNote.length > maxAtlasCollectionItemNoteLength) {
    return {
      ok: false,
      message: `Source notes must be ${maxAtlasCollectionItemNoteLength} characters or fewer.`,
    };
  }

  return {
    ok: true,
    note: normalizedNote || null,
  };
}

export function normalizeAtlasCollectionItems(
  items: readonly { note?: string | null; sourceId: string }[],
) {
  const normalizedItems: AtlasCollectionItem[] = [];
  const seenSourceIds = new Set<string>();

  for (const item of items) {
    if (seenSourceIds.has(item.sourceId)) {
      continue;
    }

    const note = normalizeAtlasCollectionItemNote(item.note);

    if (!note.ok) {
      return note;
    }

    seenSourceIds.add(item.sourceId);
    normalizedItems.push({
      note: note.note,
      sortOrder: normalizedItems.length,
      sourceId: item.sourceId,
    });
  }

  if (normalizedItems.length > maxAtlasCollectionItems) {
    return {
      ok: false as const,
      message: `Collections can include ${maxAtlasCollectionItems} sources or fewer.`,
    };
  }

  return {
    ok: true as const,
    items: normalizedItems,
  };
}

export function buildAtlasCollectionSharePath(shareSlug: string) {
  return `/atlas/collections/${encodeURIComponent(shareSlug)}`;
}

export function createAtlasCollectionShareSlug(name: string, suffix: string) {
  const slugBase = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return `${slugBase || 'collection'}-${suffix}`;
}
