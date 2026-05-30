import type { EvidenceRepository } from './evidenceRepository';
import { httpEvidenceRepository } from './httpEvidenceRepository';
import { staticEvidenceRepository } from './staticEvidenceRepository';

export function resolveClientEvidenceRepository(
  dataMode = process.env.NEXT_PUBLIC_ATLAS_DATA_MODE,
): EvidenceRepository {
  return dataMode === 'static'
    ? staticEvidenceRepository
    : httpEvidenceRepository;
}

export const clientEvidenceRepository = resolveClientEvidenceRepository();
