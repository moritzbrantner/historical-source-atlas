export type EntityOverlayCategory = 'city' | 'country' | 'person';

export const entityOverlayCategories = [
  'city',
  'country',
  'person',
] as const satisfies readonly EntityOverlayCategory[];

export type EntityOverlayEvidenceKind = 'dated' | 'undated_fallback';

export type EntityOverlayBounds = {
  east: number;
  north: number;
  south: number;
  west: number;
};

export type EntityOverlayTimeRange = {
  max: number;
  min: number;
};

export type EntityOverlayFilters = {
  bounds: EntityOverlayBounds;
  categories: EntityOverlayCategory[];
  timeRange: EntityOverlayTimeRange;
};

export type EntityOverlayLayerState = Record<EntityOverlayCategory, boolean>;

export type EntityOverlayDateRange = {
  endYear: number | null;
  startYear: number | null;
};

export type EntityOverlayPoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  metrics: { sourceCount: number };
  properties: {
    category: 'city' | 'person';
    dateLabel: string | null;
    evidenceKind: EntityOverlayEvidenceKind;
    linkedSourceCount: number;
    routePath: string;
    slug: string;
    summary: string | null;
  };
};

export type EntityOverlayGeometry =
  | {
      coordinates: unknown;
      type: 'Point';
    }
  | {
      coordinates: unknown;
      type: 'LineString';
    }
  | {
      coordinates: unknown;
      type: 'Polygon';
    }
  | {
      coordinates: unknown;
      type: 'MultiPoint';
    }
  | {
      coordinates: unknown;
      type: 'MultiLineString';
    }
  | {
      coordinates: unknown;
      type: 'MultiPolygon';
    }
  | {
      coordinates: unknown;
      type: 'GeometryCollection';
    };

export type EntityOverlayAreaProperties = {
  category: 'country';
  dateLabel: string | null;
  evidenceKind: EntityOverlayEvidenceKind;
  id: string;
  label: string;
  linkedSourceCount: number;
  routePath: string;
  slug: string;
  summary: string | null;
};

export type EntityOverlayAreaFeatureCollection = {
  features: Array<{
    geometry: EntityOverlayGeometry;
    id: string;
    properties: EntityOverlayAreaProperties;
    type: 'Feature';
  }>;
  type: 'FeatureCollection';
};

export type EntityOverlayResult = {
  areas: EntityOverlayAreaFeatureCollection;
  points: EntityOverlayPoint[];
  summary: Record<EntityOverlayCategory, number>;
};

export function createEmptyEntityOverlayResult(): EntityOverlayResult {
  return {
    areas: { features: [], type: 'FeatureCollection' },
    points: [],
    summary: {
      city: 0,
      country: 0,
      person: 0,
    },
  };
}

export function createDefaultEntityOverlayLayerState(): EntityOverlayLayerState {
  return {
    city: false,
    country: false,
    person: false,
  };
}

export function getEnabledEntityOverlayCategories(
  layers: EntityOverlayLayerState,
) {
  return entityOverlayCategories.filter((category) => layers[category]);
}

export function isEntityOverlayCategory(
  value: string,
): value is EntityOverlayCategory {
  return entityOverlayCategories.includes(value as EntityOverlayCategory);
}

export function isYearRangeKnown(range: EntityOverlayDateRange) {
  return range.startYear !== null || range.endYear !== null;
}

export function dateRangeOverlapsTimeRange(
  range: EntityOverlayDateRange,
  timeRange: EntityOverlayTimeRange,
) {
  if (!isYearRangeKnown(range)) {
    return false;
  }

  const start = range.startYear ?? Number.NEGATIVE_INFINITY;
  const end = range.endYear ?? Number.POSITIVE_INFINITY;

  return start <= timeRange.max && end >= timeRange.min;
}

export function isPointInEntityOverlayBounds(
  point: { latitude: number; longitude: number },
  bounds: EntityOverlayBounds,
) {
  return (
    point.longitude >= bounds.west &&
    point.longitude <= bounds.east &&
    point.latitude >= bounds.south &&
    point.latitude <= bounds.north
  );
}
