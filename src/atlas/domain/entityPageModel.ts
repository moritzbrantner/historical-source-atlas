import type {
  AgentEntity,
  EntityAlias,
  EntitySummary,
  EventEntity,
  ExternalIds,
  PlaceEntity,
} from './entityModel';
import type {
  Asset,
  AtlasSourceCard,
  DateRange,
  EditionType,
  Entity,
} from './dataModel';

export type AtlasEntityFact = {
  label: string;
  value: string;
};

export type TextWorkEntity = Entity & {
  abstract: string | null;
  canonicalTitle: string;
  dateRange: DateRange;
  languageOriginal: string | null;
  type: 'text_work';
  workType: string | null;
};

export type TextWitnessEntity = Entity & {
  completeness: string | null;
  dateRange: DateRange;
  language: string | null;
  script: string | null;
  siglum: string | null;
  textWork: EntitySummary | null;
  type: 'text_witness';
  witnessType: string | null;
};

export type TextEditionEntity = Entity & {
  editionType: EditionType;
  editorialPolicy: string | null;
  isPublic: boolean;
  language: string | null;
  script: string | null;
  textWitness: EntitySummary | null;
  type: 'text_edition';
  versionLabel: string | null;
};

export type ManuscriptUnitEntity = Entity & {
  folioCount: number | null;
  format: string | null;
  languageSummary: string | null;
  layoutNote: string | null;
  physicalObject: EntitySummary | null;
  quireStructure: string | null;
  scribalNote: string | null;
  scriptSummary: string | null;
  support: string | null;
  type: 'manuscript_unit';
};

export type InscriptionEntity = Entity & {
  conditionNote: string | null;
  inscriptionType: string | null;
  language: string | null;
  layoutNote: string | null;
  objectPart: EntitySummary | null;
  physicalObject: EntitySummary | null;
  script: string | null;
  technique: string | null;
  type: 'inscription';
};

export type PhysicalObjectEntity = Entity & {
  conditionNote: string | null;
  dimensions: Record<string, unknown> | null;
  isComposite: boolean;
  material: string | null;
  objectType: string | null;
  technique: string | null;
  type: 'physical_object';
};

export type ObjectPartEntity = Entity & {
  conditionNote: string | null;
  label: string | null;
  material: string | null;
  parentPart: EntitySummary | null;
  partType: string | null;
  physicalObject: EntitySummary | null;
  sequence: number | null;
  type: 'object_part';
};

export type AssetEntity = Entity &
  Asset & {
    externalIds?: ExternalIds;
    type: 'asset';
  };

export type EntityRelationView = {
  certainty: string | null;
  direction: 'incoming' | 'outgoing';
  id: string;
  note: string | null;
  objectLabel: string | null;
  objectUrl: string | null;
  predicate: string;
  target: EntitySummary | null;
};

export type EntityMentionContext = {
  certainty: string | null;
  edition: EntitySummary | null;
  endOffset: number | null;
  id: string;
  mentionText: string;
  note: string | null;
  source: AtlasSourceCard | null;
  startOffset: number | null;
  textUnitContent: string | null;
  textUnitId: string;
  textUnitLabel: string | null;
  textUnitSequence: number;
  witness: EntitySummary | null;
  work: EntitySummary | null;
};

export type AtlasEntityDetail = {
  aliases: EntityAlias[];
  entity: Entity;
  facts: AtlasEntityFact[];
  incomingRelations: EntityRelationView[];
  linkedSources: AtlasSourceCard[];
  mentions: EntityMentionContext[];
  outgoingRelations: EntityRelationView[];
  typed:
    | AgentEntity
    | PlaceEntity
    | EventEntity
    | TextWorkEntity
    | TextWitnessEntity
    | TextEditionEntity
    | ManuscriptUnitEntity
    | InscriptionEntity
    | PhysicalObjectEntity
    | ObjectPartEntity
    | AssetEntity
    | null;
};
