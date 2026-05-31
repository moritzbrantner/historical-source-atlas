import type { EntityRepository } from './entityRepository';
import { httpEntityRepository } from './httpEntityRepository';
import { staticEntityRepository } from './staticEntityRepository';

export function resolveClientEntityRepository(
  dataMode = process.env.NEXT_PUBLIC_ATLAS_DATA_MODE,
): EntityRepository {
  return dataMode === 'static' ? staticEntityRepository : httpEntityRepository;
}

export const clientEntityRepository = resolveClientEntityRepository();
