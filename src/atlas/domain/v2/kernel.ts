import type {
  Annotation,
  Assertion,
  ClaimObject,
  EvidenceLink,
  EvidenceSelector,
  Observation,
  Provenance,
} from './evidence';
import { historicalYear } from './qualification';
import type {
  DigitalAsset,
  DocumentaryRecord,
  HistoricalEntity,
  TextualRecord,
} from './records';
import {
  compareCodePoints,
  compareRefs,
  refKey,
  type AtlasDomainRef,
} from './reference';

export type AtlasEvidenceModelInput = {
  readonly documentary?: readonly DocumentaryRecord[];
  readonly textual?: readonly TextualRecord[];
  readonly historical?: readonly HistoricalEntity[];
  readonly observations?: readonly Observation[];
  readonly annotations?: readonly Annotation[];
  readonly assertions?: readonly Assertion[];
  readonly digital?: readonly DigitalAsset[];
};

export type AtlasEvidenceModel = {
  readonly documentary: readonly DocumentaryRecord[];
  readonly textual: readonly TextualRecord[];
  readonly historical: readonly HistoricalEntity[];
  readonly observations: readonly Observation[];
  readonly annotations: readonly Annotation[];
  readonly assertions: readonly Assertion[];
  readonly digital: readonly DigitalAsset[];
};

type ReferencedRecord =
  | DocumentaryRecord
  | TextualRecord
  | HistoricalEntity
  | Observation
  | Annotation
  | Assertion
  | DigitalAsset;

const evidenceStanceOrder: Record<EvidenceLink['stance'], number> = {
  supports: 0,
  contradicts: 1,
  context: 2,
};

function requireText(value: string, description: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${description} must not be blank.`);
  }
  return normalized;
}

function sortByRef<T extends { readonly ref: AtlasDomainRef }>(
  records: readonly T[],
): readonly T[] {
  return Object.freeze(
    [...records].sort((left, right) => compareRefs(left.ref, right.ref)),
  );
}

function assertReferenceExists(
  refs: ReadonlyMap<string, ReferencedRecord>,
  ref: AtlasDomainRef,
  description: string,
): void {
  if (!refs.has(refKey(ref))) {
    throw new Error(`${description} references missing ${refKey(ref)}.`);
  }
}

function validateTemporalQualification(assertion: Assertion): void {
  const temporal = assertion.validDuring;
  if (!temporal) {
    return;
  }

  const start =
    temporal.startYear === undefined
      ? undefined
      : historicalYear(temporal.startYear);
  const end =
    temporal.endYear === undefined
      ? undefined
      : historicalYear(temporal.endYear);

  if (start !== undefined && end !== undefined && start > end) {
    throw new Error('Assertion temporal start must not follow its end.');
  }
}

function validateProvenance(
  provenance: Provenance,
  refs: ReadonlyMap<string, ReferencedRecord>,
): void {
  if (provenance.status === 'unavailable') {
    requireText(provenance.reason, 'Unavailable provenance reason');
    return;
  }

  if (provenance.evidence.length === 0) {
    throw new Error('Known provenance requires at least one evidence link.');
  }

  for (const link of provenance.evidence) {
    assertReferenceExists(refs, link.evidence, 'Assertion provenance');
    const target = refs.get(refKey(link.evidence));
    if (
      target?.ref.space !== 'evidence' ||
      (target.ref.kind !== 'observation' && target.ref.kind !== 'annotation')
    ) {
      throw new Error('Assertion provenance must reference evidence items.');
    }
  }
}

function validateClaimObject(
  object: ClaimObject,
  refs: ReadonlyMap<string, ReferencedRecord>,
): void {
  if (object.kind === 'reference') {
    assertReferenceExists(refs, object.ref, 'Assertion object');
    return;
  }

  if (object.value.kind === 'number' && !Number.isFinite(object.value.value)) {
    throw new Error('Numeric assertion literals must be finite.');
  }
}

function validateEvidenceSelector(
  selector: EvidenceSelector | undefined,
  refs: ReadonlyMap<string, ReferencedRecord>,
): void {
  if (!selector) {
    return;
  }

  if (selector.kind === 'locator') {
    requireText(selector.value, 'Evidence locator');
    return;
  }

  assertReferenceExists(refs, selector.unit, 'Evidence text range');
  if (
    !Number.isInteger(selector.startOffset) ||
    !Number.isInteger(selector.endOffset) ||
    selector.startOffset < 0 ||
    selector.endOffset < selector.startOffset
  ) {
    throw new Error(
      'Evidence text ranges must use ordered non-negative offsets.',
    );
  }
}

function validateRelationships(
  model: AtlasEvidenceModelInput,
  refs: ReadonlyMap<string, ReferencedRecord>,
): void {
  for (const record of model.documentary ?? []) {
    requireText(record.label, 'Documentary label');
    if ('parent' in record) {
      assertReferenceExists(refs, record.parent, 'Source part parent');
      if (record.parent.space !== 'documentary') {
        throw new Error('Source parts must have documentary parents.');
      }
    }
  }

  for (const record of model.textual ?? []) {
    if (record.label !== undefined) {
      requireText(record.label, 'Textual label');
    }

    if ('work' in record) {
      assertReferenceExists(refs, record.work, 'Text witness work');
      assertReferenceExists(refs, record.carrier, 'Text witness carrier');
      continue;
    }

    if ('witness' in record) {
      assertReferenceExists(refs, record.witness, 'Text edition witness');
      continue;
    }

    if ('edition' in record) {
      assertReferenceExists(refs, record.edition, 'Text unit edition');
      if (record.parent) {
        assertReferenceExists(refs, record.parent, 'Text unit parent');
      }
      if (
        record.sequence !== undefined &&
        (!Number.isInteger(record.sequence) || record.sequence < 0)
      ) {
        throw new Error('Text unit sequence must be a non-negative integer.');
      }
    }
  }

  for (const entity of model.historical ?? []) {
    requireText(entity.label, 'Historical entity label');
  }

  for (const observation of model.observations ?? []) {
    assertReferenceExists(refs, observation.target, 'Observation target');
    validateEvidenceSelector(observation.selector, refs);
  }

  for (const annotation of model.annotations ?? []) {
    assertReferenceExists(refs, annotation.target, 'Annotation target');
    requireText(annotation.content, 'Annotation content');
    validateEvidenceSelector(annotation.selector, refs);
  }

  for (const assertion of model.assertions ?? []) {
    requireText(assertion.predicate, 'Assertion predicate');
    assertReferenceExists(refs, assertion.subject, 'Assertion subject');
    validateClaimObject(assertion.object, refs);
    validateTemporalQualification(assertion);
    validateProvenance(assertion.provenance, refs);
  }
}

function claimObjectKey(object: ClaimObject): string {
  if (object.kind === 'reference') {
    return JSON.stringify(['reference', refKey(object.ref)]);
  }

  return JSON.stringify(['literal', object.value.kind, object.value.value]);
}

function temporalKey(assertion: Assertion): string | null {
  if (!assertion.validDuring) {
    return null;
  }

  return JSON.stringify([
    assertion.validDuring.startYear ?? null,
    assertion.validDuring.endYear ?? null,
    assertion.validDuring.precision,
    assertion.validDuring.label ?? null,
  ]);
}

function certaintyKey(assertion: Assertion): string | null {
  if (!assertion.certainty) {
    return null;
  }

  return JSON.stringify([
    assertion.certainty.level,
    assertion.certainty.note ?? null,
  ]);
}

export function assertionSemanticKey(assertion: Assertion): string {
  return JSON.stringify([
    refKey(assertion.subject),
    assertion.predicate.trim(),
    claimObjectKey(assertion.object),
    temporalKey(assertion),
    certaintyKey(assertion),
  ]);
}

function evidenceLinkKey(link: EvidenceLink): string {
  return JSON.stringify([
    refKey(link.evidence),
    evidenceStanceOrder[link.stance],
  ]);
}

function normalizeProvenance(provenance: Provenance): Provenance {
  if (provenance.status === 'unavailable') {
    return Object.freeze({
      status: 'unavailable' as const,
      reason: provenance.reason.trim(),
    });
  }

  const evidence = Object.freeze(
    [...provenance.evidence].sort((left, right) =>
      compareCodePoints(evidenceLinkKey(left), evidenceLinkKey(right)),
    ),
  );
  const note = provenance.note?.trim();

  return Object.freeze({
    status: 'known' as const,
    evidence,
    ...(note ? { note } : {}),
  });
}

function provenanceKey(provenance: Provenance): string {
  const normalized = normalizeProvenance(provenance);
  if (normalized.status === 'unavailable') {
    return JSON.stringify(['unavailable', normalized.reason]);
  }

  return JSON.stringify([
    'known',
    normalized.evidence.map(evidenceLinkKey),
    normalized.note ?? null,
  ]);
}

function normalizeAssertion(assertion: Assertion): Assertion {
  return Object.freeze({
    ...assertion,
    predicate: assertion.predicate.trim(),
    provenance: normalizeProvenance(assertion.provenance),
  });
}

function assertionOrderKey(assertion: Assertion): string {
  return JSON.stringify([
    assertionSemanticKey(assertion),
    provenanceKey(assertion.provenance),
    refKey(assertion.ref),
  ]);
}

function sortAssertions(
  assertions: readonly Assertion[],
): readonly Assertion[] {
  const normalized = assertions.map(normalizeAssertion);
  return Object.freeze(
    normalized.sort((left, right) =>
      compareCodePoints(assertionOrderKey(left), assertionOrderKey(right)),
    ),
  );
}

export function createAtlasEvidenceModel(
  input: AtlasEvidenceModelInput,
): AtlasEvidenceModel {
  const allRecords: ReferencedRecord[] = [
    ...(input.documentary ?? []),
    ...(input.textual ?? []),
    ...(input.historical ?? []),
    ...(input.observations ?? []),
    ...(input.annotations ?? []),
    ...(input.assertions ?? []),
    ...(input.digital ?? []),
  ];
  const refs = new Map<string, ReferencedRecord>();

  for (const record of allRecords) {
    const key = refKey(record.ref);
    if (refs.has(key)) {
      throw new Error(`Duplicate domain reference ${key}.`);
    }
    refs.set(key, record);
  }

  validateRelationships(input, refs);

  return Object.freeze({
    documentary: sortByRef(input.documentary ?? []),
    textual: sortByRef(input.textual ?? []),
    historical: sortByRef(input.historical ?? []),
    observations: sortByRef(input.observations ?? []),
    annotations: sortByRef(input.annotations ?? []),
    assertions: sortAssertions(input.assertions ?? []),
    digital: sortByRef(input.digital ?? []),
  });
}

export function getAssertionsForSubject(
  model: AtlasEvidenceModel,
  subject: AtlasDomainRef,
): readonly Assertion[] {
  const key = refKey(subject);
  return model.assertions.filter(
    (assertion) => refKey(assertion.subject) === key,
  );
}
