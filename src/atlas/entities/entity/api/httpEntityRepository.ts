import type { EntityRepository } from './entityRepository';

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (response.status === 404) {
    return null as T;
  }

  if (!response.ok) {
    throw new Error(`Atlas entity API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const httpEntityRepository: EntityRepository = {
  getEntityBySlug(slug) {
    return readJson(`/api/atlas/entities/${encodeURIComponent(slug)}`);
  },
  getEntityLinkedSources(slug) {
    return readJson(`/api/atlas/entities/${encodeURIComponent(slug)}/sources`);
  },
  getEntityMentions(slug) {
    return readJson(`/api/atlas/entities/${encodeURIComponent(slug)}/mentions`);
  },
  getEntityRelations(slug) {
    return readJson(
      `/api/atlas/entities/${encodeURIComponent(slug)}/relations`,
    );
  },
  listEntities(filters = {}) {
    const searchParams = new URLSearchParams();

    if (filters.query) {
      searchParams.set('query', filters.query);
    }

    if (filters.type) {
      searchParams.set('type', filters.type);
    }

    if (filters.kind) {
      searchParams.set('kind', filters.kind);
    }

    const suffix = searchParams.size ? `?${searchParams.toString()}` : '';

    return readJson(`/api/atlas/entities${suffix}`);
  },
};
