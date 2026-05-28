import type { SourceRepository } from './sourceRepository';

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
    throw new Error(`Atlas API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const httpSourceRepository: SourceRepository = {
  getSourceBySlug(slug) {
    return readJson(`/api/atlas/sources/${encodeURIComponent(slug)}`);
  },
  listAtlasSources() {
    return readJson('/api/atlas/sources');
  },
};
