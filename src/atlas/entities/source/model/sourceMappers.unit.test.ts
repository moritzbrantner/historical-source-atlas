import { describe, expect, it } from 'vitest';

import { historicalSources } from '../api/staticSourceData';
import { historicalSourceToAtlasSourceCard } from './sourceMappers';

const source = historicalSources[0]!;

describe('sourceMappers', () => {
  it('maps historical sources to atlas source cards', () => {
    const card = historicalSourceToAtlasSourceCard(source);

    expect(card).toMatchObject({
      currentRepository: source.properties.currentRepository,
      discoveryDateLabel: source.properties.discovered,
      discoveryYear: source.properties.discoveredYear,
      heroAssetUrl: null,
      id: source.id,
      importance: source.metrics.importance,
      kind: source.properties.kind,
      label: source.label,
      latitude: source.latitude,
      locationLabel: source.properties.location,
      longitude: source.longitude,
      region: source.properties.region,
      slug: source.id,
      sourceDateLabel: source.properties.period,
      sourceYear: source.properties.sourceYear,
      summary: source.properties.summary,
    });
  });
});
