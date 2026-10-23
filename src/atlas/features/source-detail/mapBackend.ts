export type SourceMapBackend = 'maplibre' | 'maps';

export function getSourceMapBackend(search: string): {
  backend: SourceMapBackend;
  unsupportedValue: string | null;
} {
  const requested = new URLSearchParams(search).get('mapBackend');

  if (requested === 'maps') {
    return { backend: 'maps', unsupportedValue: null };
  }

  return {
    backend: 'maplibre',
    unsupportedValue:
      requested === null || requested === 'maplibre' ? null : requested,
  };
}

/** Carry only the explicitly chosen presentation backend into another source page. */
export function sourcePathWithMapBackend(path: string, search: string) {
  const params = new URLSearchParams(search);
  const requested = params.get('mapBackend');

  return requested === 'maplibre' || requested === 'maps'
    ? path + '?mapBackend=' + requested
    : path;
}
