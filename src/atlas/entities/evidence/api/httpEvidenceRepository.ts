import type { EvidenceReview } from '../model/evidenceTypes';
import type { EvidenceRepository } from './evidenceRepository';

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
    throw new Error(
      `Atlas evidence API request failed with ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export const httpEvidenceRepository: EvidenceRepository = {
  getEvidenceBySourceSlug(slug) {
    return readJson<EvidenceReview | null>(
      `/api/atlas/sources/${encodeURIComponent(slug)}/evidence`,
    );
  },
};
