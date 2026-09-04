import type { Certainty, TemporalQualification } from './qualification';
import type {
  DigitalRef,
  DocumentaryRef,
  EvidenceRef,
  HistoricalRef,
  TextualRef,
} from './reference';

export type EvidenceAnchorRef = DocumentaryRef | TextualRef | DigitalRef;
export type ClaimSubjectRef = DocumentaryRef | TextualRef | HistoricalRef;
export type ClaimObjectRef = DocumentaryRef | TextualRef | HistoricalRef;
export type EvidenceItemRef = EvidenceRef<'observation' | 'annotation'>;

export type EvidenceSelector =
  | {
      readonly kind: 'text-range';
      readonly unit: TextualRef<'text-unit'>;
      readonly startOffset: number;
      readonly endOffset: number;
    }
  | {
      readonly kind: 'locator';
      readonly value: string;
    };

export type Observation = {
  readonly ref: EvidenceRef<'observation'>;
  readonly target: EvidenceAnchorRef;
  readonly selector?: EvidenceSelector;
  readonly note?: string;
};

export type AnnotationKind =
  | 'note'
  | 'transcription'
  | 'translation'
  | 'entity-mention'
  | 'other';

export type Annotation = {
  readonly ref: EvidenceRef<'annotation'>;
  readonly target: EvidenceAnchorRef;
  readonly selector?: EvidenceSelector;
  readonly annotationKind: AnnotationKind;
  readonly content: string;
};

export type EvidenceStance = 'supports' | 'contradicts' | 'context';

export type EvidenceLink = {
  readonly evidence: EvidenceItemRef;
  readonly stance: EvidenceStance;
};

export type KnownProvenance = {
  readonly status: 'known';
  readonly evidence: readonly EvidenceLink[];
  readonly note?: string;
};

export type UnavailableProvenance = {
  readonly status: 'unavailable';
  readonly reason: string;
};

export type Provenance = KnownProvenance | UnavailableProvenance;

export type ClaimLiteral =
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'boolean'; readonly value: boolean };

export type ClaimObject =
  | { readonly kind: 'reference'; readonly ref: ClaimObjectRef }
  | { readonly kind: 'literal'; readonly value: ClaimLiteral };

export type Assertion = {
  readonly ref: EvidenceRef<'assertion'>;
  readonly subject: ClaimSubjectRef;
  readonly predicate: string;
  readonly object: ClaimObject;
  readonly validDuring?: TemporalQualification;
  readonly certainty?: Certainty;
  readonly provenance: Provenance;
};

export function knownProvenance(
  evidence: readonly EvidenceLink[],
  note?: string,
): KnownProvenance {
  if (evidence.length === 0) {
    throw new Error('Known provenance requires at least one evidence link.');
  }

  const normalizedNote = note?.trim();
  return Object.freeze({
    status: 'known' as const,
    evidence: Object.freeze([...evidence]),
    ...(normalizedNote ? { note: normalizedNote } : {}),
  });
}

export function unavailableProvenance(reason: string): UnavailableProvenance {
  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throw new Error('Unavailable provenance requires a reason.');
  }

  return Object.freeze({
    status: 'unavailable' as const,
    reason: normalizedReason,
  });
}
