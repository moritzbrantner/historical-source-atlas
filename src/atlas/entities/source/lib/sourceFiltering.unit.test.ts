import { describe, expect, it } from 'vitest';

import { allSourceKinds } from '../model/sourceConstants';
import type {
  HistoricalSource,
  HistoricalSourceProperties,
  SourceKind,
} from '../model/sourceTypes';
import {
  filterSources,
  sortSourcesByTimeline,
  type SourceFilters,
  type SourceKindFilters,
} from './sourceFiltering';

const sources: HistoricalSource[] = [
  sourceFixture({
    id: 'alpha-tablet',
    kind: 'manuscript',
    label: 'Alpha Tablet',
    references: [
      { label: 'Beta Chronicle', note: 'Points to beta', relation: 'quotes' },
    ],
  }),
  sourceFixture({
    discoveredYear: 1905,
    id: 'beta-chronicle',
    kind: 'text',
    label: 'Beta Chronicle',
    location: 'Beta Archive',
    references: [
      { label: 'Gamma Inscription', note: 'Second hop', relation: 'cites' },
    ],
    region: 'Delta Region',
    sourceYear: -200,
    summary: 'Contains search-only summary words.',
  }),
  sourceFixture({
    discoveredYear: 1910,
    id: 'gamma-inscription',
    kind: 'inscription',
    label: 'Gamma Inscription',
    sourceYear: -150,
  }),
  sourceFixture({
    discoveredYear: 1920,
    id: 'delta-commentary',
    kind: 'artifact',
    label: 'Delta Commentary',
    references: [
      {
        label: 'Alpha Tablet',
        note: 'Incoming to alpha',
        relation: 'comments on',
      },
    ],
    referencedIn: [
      {
        label: 'Zeta Catalogue',
        note: 'Referenced-in searchable',
        relation: 'lists',
      },
    ],
    sourceYear: -100,
  }),
  sourceFixture({
    discoveredYear: 1920,
    id: 'epsilon-archive',
    kind: 'archive',
    label: 'Epsilon Archive',
    sourceYear: -100,
  }),
];

describe('sourceFiltering', () => {
  it('returns all sources with default filters and full timeline ranges', () => {
    expect(
      filterSources(sources, createFilters()).map((source) => source.id),
    ).toEqual(sources.map((source) => source.id));
  });

  it('matches query text across source and relationship fields case-insensitively', () => {
    expect(
      filterSources(sources, createFilters({ query: ' alpha ' })).map(ids),
    ).toEqual(['alpha-tablet', 'delta-commentary']);
    expect(
      filterSources(sources, createFilters({ query: 'beta archive' })).map(ids),
    ).toEqual(['beta-chronicle']);
    expect(
      filterSources(sources, createFilters({ query: 'delta region' })).map(ids),
    ).toEqual(['beta-chronicle']);
    expect(
      filterSources(sources, createFilters({ query: 'SEARCH-ONLY' })).map(ids),
    ).toEqual(['beta-chronicle']);
    expect(
      filterSources(
        sources,
        createFilters({ query: 'referenced-in searchable' }),
      ).map(ids),
    ).toEqual(['delta-commentary']);
  });

  it('applies discovery and source timeline ranges together', () => {
    expect(
      filterSources(
        sources,
        createFilters({
          timelineRanges: {
            discovery: { max: 1910, min: 1900 },
            source: { max: -175, min: -250 },
          },
        }),
      ).map(ids),
    ).toEqual(['beta-chronicle']);
  });

  it('excludes a kind when all is false and no relationship filter is enabled', () => {
    expect(
      filterSources(
        sources,
        createFilters({
          sourceKinds: withKindFilter('text', {
            all: false,
            referenced: { depth: 1, enabled: false },
            referencing: { depth: 1, enabled: false },
          }),
        }),
      ).map(ids),
    ).not.toContain('beta-chronicle');
  });

  it('includes selected outgoing relationships at depth one', () => {
    expect(
      filterSources(
        sources,
        createFilters({
          selectedSourceId: 'alpha-tablet',
          sourceKinds: onlyKindRelationship('text', 'referenced', 1),
        }),
      ).map(ids),
    ).toEqual(['beta-chronicle']);
  });

  it('includes selected incoming relationships at depth one', () => {
    expect(
      filterSources(
        sources,
        createFilters({
          selectedSourceId: 'alpha-tablet',
          sourceKinds: onlyKindRelationship('artifact', 'referencing', 1),
        }),
      ).map(ids),
    ).toEqual(['delta-commentary']);
  });

  it('includes second-hop relationships and excludes the selected source itself', () => {
    expect(
      filterSources(
        sources,
        createFilters({
          selectedSourceId: 'alpha-tablet',
          sourceKinds: onlyKindRelationship('inscription', 'referenced', 2),
        }),
      ).map(ids),
    ).toEqual(['gamma-inscription']);
  });

  it('sorts by timeline year and then label', () => {
    expect(
      sortSourcesByTimeline([sources[4]!, sources[3]!], 'source').map(ids),
    ).toEqual(['delta-commentary', 'epsilon-archive']);
  });
});

function ids(source: HistoricalSource) {
  return source.id;
}

function createFilters(overrides: Partial<SourceFilters> = {}): SourceFilters {
  return {
    query: '',
    selectedSourceId: 'alpha-tablet',
    sourceKinds: createSourceKindFilters(),
    timelineRanges: {
      discovery: { max: 3000, min: -3000 },
      source: { max: 3000, min: -3000 },
    },
    ...overrides,
  };
}

function createSourceKindFilters(): SourceKindFilters {
  return Object.fromEntries(
    allSourceKinds.map((kind) => [
      kind,
      {
        all: true,
        referenced: { depth: 1, enabled: false },
        referencing: { depth: 1, enabled: false },
      },
    ]),
  ) as SourceKindFilters;
}

function withKindFilter(
  kind: SourceKind,
  filter: SourceKindFilters[SourceKind],
): SourceKindFilters {
  return {
    ...createSourceKindFilters(),
    [kind]: filter,
  };
}

function onlyKindRelationship(
  kind: SourceKind,
  relationship: 'referenced' | 'referencing',
  depth: number,
): SourceKindFilters {
  const filters = Object.fromEntries(
    allSourceKinds.map((sourceKind) => [
      sourceKind,
      {
        all: false,
        referenced: { depth: 1, enabled: false },
        referencing: { depth: 1, enabled: false },
      },
    ]),
  ) as SourceKindFilters;

  return {
    ...filters,
    [kind]: {
      all: false,
      referenced: { depth, enabled: relationship === 'referenced' },
      referencing: { depth, enabled: relationship === 'referencing' },
    },
  };
}

function sourceFixture({
  discoveredYear = 1900,
  id,
  kind,
  label,
  location = 'Fixture Findspot',
  referencedIn = [],
  references = [],
  region = 'Fixture Region',
  sourceYear = -300,
  summary = 'Fixture summary',
}: {
  discoveredYear?: number;
  id: string;
  kind: SourceKind;
  label: string;
  location?: string;
  referencedIn?: HistoricalSourceProperties['referencedIn'];
  references?: HistoricalSourceProperties['references'];
  region?: string;
  sourceYear?: number;
  summary?: string;
}): HistoricalSource {
  return {
    id,
    label,
    latitude: 10,
    longitude: 20,
    metrics: { importance: 5 },
    properties: {
      currentRepository: 'Repository',
      discovered: `${discoveredYear}`,
      discoveredYear,
      discoveryContext: 'Discovery context',
      kind,
      location,
      period: `${sourceYear}`,
      referencedIn,
      references,
      region,
      sourceYear,
      summary,
    },
  };
}
