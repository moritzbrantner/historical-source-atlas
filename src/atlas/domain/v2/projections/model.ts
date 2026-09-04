import type {
  Annotation,
  Assertion,
  ClaimSubjectRef,
  Observation,
  Provenance,
} from '../evidence';
import type { Certainty, TemporalQualification } from '../qualification';
import type {
  DigitalAsset,
  DocumentarySource,
  HistoricalEntity,
  SourcePart,
  TextEdition,
  TextUnit,
  TextWitness,
  TextWork,
} from '../records';
import type { AtlasDomainRef, EvidenceRef, HistoricalRef } from '../reference';

export type EvidenceProjectionItem = Observation | Annotation;

export type AssertionEvidenceProjection = {
  readonly assertion: Assertion;
  readonly evidence: readonly EvidenceProjectionItem[];
};

export type EvidenceReviewProjection = {
  readonly observations: readonly Observation[];
  readonly annotations: readonly Annotation[];
  readonly assertions: readonly AssertionEvidenceProjection[];
};

export type SourceDetailProjection = {
  readonly source: DocumentarySource;
  readonly parts: readonly SourcePart[];
  readonly works: readonly TextWork[];
  readonly witnesses: readonly TextWitness[];
  readonly editions: readonly TextEdition[];
  readonly units: readonly TextUnit[];
  readonly outgoingAssertions: readonly Assertion[];
  readonly incomingAssertions: readonly Assertion[];
  readonly evidence: EvidenceReviewProjection;
};

export type HistoricalEntityDetailProjection = {
  readonly entity: HistoricalEntity;
  readonly outgoingAssertions: readonly Assertion[];
  readonly incomingAssertions: readonly Assertion[];
  readonly evidence: EvidenceReviewProjection;
};

export type MapPlaceClaimFeature = {
  readonly id: string;
  readonly assertion: EvidenceRef<'assertion'>;
  readonly subject: ClaimSubjectRef;
  readonly place: HistoricalRef<'place'>;
  readonly temporal?: TemporalQualification;
  readonly certainty?: Certainty;
  readonly provenance: Provenance;
};

export type TimelineClaimEntry = {
  readonly id: string;
  readonly assertion: EvidenceRef<'assertion'>;
  readonly subject: ClaimSubjectRef;
  readonly predicate: string;
  readonly temporal: TemporalQualification;
  readonly certainty?: Certainty;
  readonly provenance: Provenance;
};

export type SearchProjectionRecord =
  | DocumentarySource
  | SourcePart
  | TextWork
  | TextWitness
  | TextEdition
  | TextUnit
  | HistoricalEntity
  | DigitalAsset;

export type SearchDocumentProjection = {
  readonly id: string;
  readonly ref: AtlasDomainRef;
  readonly label: string;
  readonly category: string;
  readonly searchableText: string;
  readonly assertionRefs: readonly EvidenceRef<'assertion'>[];
};
