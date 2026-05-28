import { describe, expect, it } from 'vitest';

import { historicalSources } from '../entities/source/api/staticSourceData';
import { staticAtlasSourceCards } from './atlasReadModel';
import type { RecordKind } from './dataModel';

const supportedRecordKinds: readonly RecordKind[] = [
  'archive',
  'artifact',
  'collection',
  'inscription',
  'manuscript',
  'text',
];

describe('atlasReadModel', () => {
  it('maps one card per static historical source', () => {
    expect(staticAtlasSourceCards).toHaveLength(historicalSources.length);
  });

  it('has unique ids and slugs', () => {
    expect(new Set(staticAtlasSourceCards.map((card) => card.id)).size).toBe(
      staticAtlasSourceCards.length,
    );
    expect(new Set(staticAtlasSourceCards.map((card) => card.slug)).size).toBe(
      staticAtlasSourceCards.length,
    );
  });

  it('has valid coordinates where present', () => {
    staticAtlasSourceCards.forEach((card) => {
      if (card.latitude !== null) {
        expect(card.latitude).toBeGreaterThanOrEqual(-90);
        expect(card.latitude).toBeLessThanOrEqual(90);
      }

      if (card.longitude !== null) {
        expect(card.longitude).toBeGreaterThanOrEqual(-180);
        expect(card.longitude).toBeLessThanOrEqual(180);
      }
    });
  });

  it('uses supported record kinds', () => {
    staticAtlasSourceCards.forEach((card) => {
      expect(supportedRecordKinds).toContain(card.kind);
    });
  });

  it('keeps importance in atlas weight bounds', () => {
    staticAtlasSourceCards.forEach((card) => {
      expect(card.importance).toBeGreaterThanOrEqual(1);
      expect(card.importance).toBeLessThanOrEqual(10);
    });
  });
});
