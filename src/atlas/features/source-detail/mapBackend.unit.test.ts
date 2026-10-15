import { describe, expect, test } from 'vitest';

import { getSourceMapBackend, sourcePathWithMapBackend } from './mapBackend';

describe('source map backend URL contract', () => {
  test('defaults to MapLibre without changing historical routes', () => {
    expect(getSourceMapBackend('')).toEqual({
      backend: 'maplibre',
      unsupportedValue: null,
    });
    expect(sourcePathWithMapBackend('/atlas/sources/rosetta-stone', '')).toBe(
      '/atlas/sources/rosetta-stone',
    );
  });

  test('accepts only the two public renderer choices', () => {
    expect(getSourceMapBackend('?mapBackend=maps').backend).toBe('maps');
    expect(getSourceMapBackend('?mapBackend=maplibre').backend).toBe('maplibre');
    expect(getSourceMapBackend('?mapBackend=other')).toEqual({
      backend: 'maplibre',
      unsupportedValue: 'other',
    });
  });

  test('preserves an explicit engine choice on source navigation', () => {
    expect(
      sourcePathWithMapBackend(
        '/atlas/sources/nag-hammadi-codices',
        '?tab=detail&mapBackend=maps',
      ),
    ).toBe('/atlas/sources/nag-hammadi-codices?mapBackend=maps');
    expect(
      sourcePathWithMapBackend(
        '/atlas/sources/nag-hammadi-codices',
        '?mapBackend=maplibre',
      ),
    ).toBe('/atlas/sources/nag-hammadi-codices?mapBackend=maplibre');
  });

  test('does not carry unsupported engine values across routes', () => {
    expect(
      sourcePathWithMapBackend(
        '/atlas/sources/rosetta-stone',
        '?mapBackend=unknown',
      ),
    ).toBe('/atlas/sources/rosetta-stone');
  });
});
