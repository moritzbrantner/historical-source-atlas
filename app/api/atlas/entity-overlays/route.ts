import {
  createEmptyEntityOverlayResult,
  entityOverlayCategories,
  isEntityOverlayCategory,
  type EntityOverlayCategory,
  type EntityOverlayFilters,
} from '@/src/atlas/domain/entityOverlayModel';
import { listAtlasEntityOverlayFeaturesFromDb } from '@/src/atlas/server/atlasEntityOverlayRepository';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseEntityOverlayFilters(url.searchParams);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.filters.categories.length === 0) {
    return Response.json(createEmptyEntityOverlayResult());
  }

  const overlays = await listAtlasEntityOverlayFeaturesFromDb(parsed.filters);

  return Response.json(overlays);
}

type ParseResult =
  | { filters: EntityOverlayFilters; ok: true }
  | { error: string; ok: false };

export function parseEntityOverlayFilters(
  searchParams: URLSearchParams,
): ParseResult {
  const west = parseRequiredNumber(searchParams, 'west');
  const south = parseRequiredNumber(searchParams, 'south');
  const east = parseRequiredNumber(searchParams, 'east');
  const north = parseRequiredNumber(searchParams, 'north');
  const minYear = parseRequiredNumber(searchParams, 'minYear');
  const maxYear = parseRequiredNumber(searchParams, 'maxYear');

  if (
    west === null ||
    south === null ||
    east === null ||
    north === null ||
    minYear === null ||
    maxYear === null
  ) {
    return { error: 'Invalid entity overlay query parameters', ok: false };
  }

  if (
    west < -180 ||
    east > 180 ||
    south < -90 ||
    north > 90 ||
    west > east ||
    south > north ||
    minYear > maxYear
  ) {
    return { error: 'Invalid entity overlay query bounds', ok: false };
  }

  const categories = parseCategories(searchParams.get('categories'));

  if (categories === null) {
    return { error: 'Invalid entity overlay categories', ok: false };
  }

  return {
    filters: {
      bounds: { east, north, south, west },
      categories,
      timeRange: { max: maxYear, min: minYear },
    },
    ok: true,
  };
}

function parseRequiredNumber(
  searchParams: URLSearchParams,
  key: string,
): number | null {
  const value = searchParams.get(key);

  if (value === null || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseCategories(value: string | null): EntityOverlayCategory[] | null {
  if (value === null || value.trim() === '') {
    return [];
  }

  const categories = value
    .split(',')
    .map((category) => category.trim())
    .filter(Boolean);

  if (
    categories.some((category) => !isEntityOverlayCategory(category)) ||
    categories.length > entityOverlayCategories.length
  ) {
    return null;
  }

  return [...new Set(categories)] as EntityOverlayCategory[];
}
