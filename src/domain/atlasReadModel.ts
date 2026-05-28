import type { HistoricalSource } from "../sources";
import { historicalSources } from "../sources";
import type { AtlasSourceCard } from "./dataModel";

export function historicalSourceToAtlasSourceCard(source: HistoricalSource): AtlasSourceCard {
  return {
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
  };
}

export const staticAtlasSourceCards = historicalSources.map(historicalSourceToAtlasSourceCard);
