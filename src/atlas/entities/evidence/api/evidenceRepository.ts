import type { EvidenceReview } from '../model/evidenceTypes';

export type EvidenceRepository = {
  getEvidenceBySourceSlug: (slug: string) => Promise<EvidenceReview | null>;
};
