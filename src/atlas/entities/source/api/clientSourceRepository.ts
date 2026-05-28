import type { SourceRepository } from './sourceRepository';
import { httpSourceRepository } from './httpSourceRepository';
import { staticSourceRepository } from './staticSourceRepository';

export function resolveClientSourceRepository(
  dataMode = process.env.NEXT_PUBLIC_ATLAS_DATA_MODE,
): SourceRepository {
  return dataMode === 'static' ? staticSourceRepository : httpSourceRepository;
}

export const clientSourceRepository = resolveClientSourceRepository();
