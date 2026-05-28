import type { AtlasSourceCard } from "../../../domain/dataModel";
import type { HistoricalSource } from "./sourceTypes";

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
