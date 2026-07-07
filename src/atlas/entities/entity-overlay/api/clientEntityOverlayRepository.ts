import { httpEntityOverlayRepository } from './httpEntityOverlayRepository';
import { staticEntityOverlayRepository } from './staticEntityOverlayRepository';
import type { EntityOverlayRepository } from './entityOverlayRepository';

export function resolveClientEntityOverlayRepository(
  dataMode = process.env.NEXT_PUBLIC_ATLAS_DATA_MODE,
): EntityOverlayRepository {
  return dataMode === 'static'
    ? staticEntityOverlayRepository
    : httpEntityOverlayRepository;
}

export const clientEntityOverlayRepository =
  resolveClientEntityOverlayRepository();
