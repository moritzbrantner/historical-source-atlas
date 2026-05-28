import type { MapPoint } from "@moritzbrantner/maps";

export type SourceKind =
  | "text"
  | "artifact"
  | "inscription"
  | "manuscript"
  | "collection"
  | "archive";

export type SourceRelationship = {
  label: string;
  note: string;
  relation: string;
};

export type HistoricalSourceProperties = {
  currentRepository: string;
  discovered: string;
  discoveryContext: string;
  discoveredYear: number;
  kind: SourceKind;
  location: string;
  period: string;
  referencedIn: SourceRelationship[];
  references: SourceRelationship[];
  region: string;
  sourceYear: number;
  summary: string;
};

export type HistoricalSource = MapPoint<HistoricalSourceProperties> & {
  id: string;
  label: string;
  metrics: {
    importance: number;
  };
  properties: HistoricalSourceProperties;
};
