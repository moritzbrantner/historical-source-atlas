import type { DateRange, Entity, EntityType } from './dataModel';

export type AgentKind =
  | 'person'
  | 'group'
  | 'institution'
  | 'repository'
  | 'dynasty'
  | 'deity'
  | 'unknown';

export type PlaceKind =
  | 'city'
  | 'settlement'
  | 'site'
  | 'region'
  | 'country'
  | 'empire'
  | 'province'
  | 'border'
  | 'river'
  | 'sea'
  | 'unknown';

export type EventKind =
  | 'birth'
  | 'death'
  | 'battle'
  | 'coronation'
  | 'foundation'
  | 'destruction'
  | 'composition'
  | 'production'
  | 'discovery'
  | 'publication'
  | 'journey'
  | 'treaty'
  | 'reign'
  | 'other';

export type EntityAlias = {
  id: string;
  isPrimary: boolean;
  language: string | null;
  name: string;
  nameType: string;
  script: string | null;
  sourceNote: string | null;
};

export type EntitySummary = {
  displayCategory: string;
  id: string;
  preferredLabel: string;
  slug: string;
  summary: string | null;
  type: EntityType;
};

export type ExternalIds = Record<string, string | string[] | number | null>;

export type GeometryType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon'
  | 'GeometryCollection';

export type Geometry = {
  coordinates: unknown;
  type: GeometryType;
};

export type HistoricalGeometry = {
  certainty: string | null;
  dateRange: DateRange;
  geometry: Geometry;
  geometryRole: string;
  id: string;
  sourceNote: string | null;
};

export type AgentEntity = Entity & {
  agentKind: AgentKind;
  aliases: EntityAlias[];
  dateRange: DateRange;
  externalIds: ExternalIds;
  name: string;
  type: 'agent';
};

export type PersonEntity = AgentEntity & {
  agentKind: 'person';
};

export type PlaceEntity = Entity & {
  aliases: EntityAlias[];
  ancientRegion: string | null;
  certainty: string | null;
  externalIds: ExternalIds;
  geometry: Geometry | null;
  historicalGeometries: HistoricalGeometry[];
  modernCountry: string | null;
  name: string;
  placeKind: PlaceKind;
  type: 'place';
};

export type CityEntity = PlaceEntity & {
  placeKind: 'city';
};

export type BorderEntity = PlaceEntity & {
  placeKind: 'border';
};

export type EventAgent = {
  agent: AgentEntity;
  role: string;
};

export type EventPlace = {
  certainty: string | null;
  note: string | null;
  place: PlaceEntity;
  role: string;
};

export type EventEntity = Entity & {
  agents: EventAgent[];
  dateRange: DateRange;
  description: string | null;
  eventKind: EventKind;
  places: EventPlace[];
  primaryPlace: PlaceEntity | null;
  type: 'event';
};

export type EntityMention = {
  certainty: string | null;
  endOffset: number | null;
  entity: EntitySummary;
  id: string;
  mentionText: string;
  note: string | null;
  source: string | null;
  startOffset: number | null;
  textUnitId: string;
};

export type SourceEntityContext = {
  borders: BorderEntity[];
  events: EventEntity[];
  mentions: EntityMention[];
  otherEntities: EntitySummary[];
  people: PersonEntity[];
  places: PlaceEntity[];
};
