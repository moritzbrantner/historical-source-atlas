export type EntityType =
  | "catalog_record"
  | "physical_object"
  | "object_part"
  | "text_work"
  | "text_witness"
  | "text_edition"
  | "inscription"
  | "manuscript_unit"
  | "place"
  | "agent"
  | "event"
  | "asset";

export type RecordKind =
  | "artifact"
  | "inscription"
  | "manuscript"
  | "text"
  | "collection"
  | "archive";

export type DatePrecision = "exact" | "year" | "range" | "century" | "circa" | "unknown";

export type EditionType =
  | "transcription"
  | "transliteration"
  | "translation"
  | "normalized_text"
  | "commentary";

export type AssetKind = "image" | "pdf" | "iiif_manifest" | "scan" | "derivative" | "ocr" | "other";

export type Entity = {
  id: string;
  type: EntityType;
  slug: string;
  preferredLabel: string;
  summary: string | null;
  description: string | null;
  editorialStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type DateRange = {
  endYear: number | null;
  label: string | null;
  precision: DatePrecision;
  startYear: number | null;
};

export type AtlasSourceCard = {
  currentRepository: string | null;
  discoveryDateLabel: string | null;
  discoveryYear: number | null;
  heroAssetUrl: string | null;
  id: string;
  importance: number;
  kind: RecordKind;
  label: string;
  latitude: number | null;
  locationLabel: string | null;
  longitude: number | null;
  region: string | null;
  slug: string;
  sourceDateLabel: string | null;
  sourceYear: number | null;
  summary: string | null;
};

export type Asset = {
  assetKind: AssetKind;
  attribution: string | null;
  bucket: string;
  byteSize: number | null;
  contentType: string | null;
  createdAt: string;
  entityId: string;
  height: number | null;
  id: string;
  isPublic: boolean;
  license: string | null;
  objectKey: string;
  originalFilename: string | null;
  pageCount: number | null;
  rightsStatement: string | null;
  sha256: string | null;
  sourceUrl: string | null;
  width: number | null;
};

export type AssetLink = {
  assetId: string;
  caption: string | null;
  entityId: string;
  id: string;
  role: string;
  sequence: number;
};

export type EntityRelation = {
  bibliographicItemId: string | null;
  certainty: string | null;
  id: string;
  note: string | null;
  objectEntityId: string | null;
  objectLabel: string | null;
  objectUrl: string | null;
  predicate: string;
  subjectEntityId: string;
};

export type TextUnit = {
  content: string | null;
  id: string;
  label: string | null;
  normalizedContent: string | null;
  note: string | null;
  objectPartId: string | null;
  parentUnitId: string | null;
  sequence: number;
  textEditionId: string;
  unitType: string;
};

export type TextAnnotation = {
  annotationType: string;
  certainty: string | null;
  content: string | null;
  createdAt: string;
  endOffset: number | null;
  id: string;
  startOffset: number | null;
  textUnitId: string;
};

export * from "./entityModel";
