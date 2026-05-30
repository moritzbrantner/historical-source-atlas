import type { EvidenceRepository } from './evidenceRepository';
import { staticEvidenceReviews } from './staticEvidenceData';

const evidenceBySourceSlug = new Map(
  staticEvidenceReviews.map((review) => [review.sourceSlug, review]),
);

export const staticEvidenceRepository: EvidenceRepository = {
  async getEvidenceBySourceSlug(slug) {
    return evidenceBySourceSlug.get(slug) ?? null;
  },
};
