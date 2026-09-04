import type {
  Annotation,
  Assertion,
  ClaimObjectRef,
  Observation,
} from '../evidence';
import type { AtlasEvidenceModel } from '../kernel';
import type {
  DocumentaryRecord,
  DocumentarySource,
  HistoricalEntity,
  SourcePart,
  TextEdition,
  TextualRecord,
  TextUnit,
  TextWitness,
  TextWork,
} from '../records';
import {
  compareRefs,
  refKey,
  type AtlasDomainRef,
  type HistoricalRef,
} from '../reference';
import type {
  AssertionEvidenceProjection,
  EvidenceProjectionItem,
  EvidenceReviewProjection,
  HistoricalEntityDetailProjection,
  MapPlaceClaimFeature,
  SearchDocumentProjection,
  SearchProjectionRecord,
  SourceDetailProjection,
  TimelineClaimEntry,
} from './model';

type ProjectionRecord =
  | SearchProjectionRecord
  | Observation
  | Annotation
  | Assertion;

type ProjectionIndex = {
  readonly records: ReadonlyMap<string, ProjectionRecord>;
  readonly observations: ReadonlyMap<string, Observation>;
  readonly annotations: ReadonlyMap<string, Annotation>;
};

function isDocumentarySource(
  record: DocumentaryRecord,
): record is DocumentarySource {
  return record.ref.kind === 'source';
}

function isSourcePart(record: DocumentaryRecord): record is SourcePart {
  return record.ref.kind === 'source-part';
}

function isTextWork(record: TextualRecord): record is TextWork {
  return record.ref.kind === 'work';
}

function isTextWitness(record: TextualRecord): record is TextWitness {
  return record.ref.kind === 'witness';
}

function isTextEdition(record: TextualRecord): record is TextEdition {
  return record.ref.kind === 'edition';
}

function isTextUnit(record: TextualRecord): record is TextUnit {
  return record.ref.kind === 'text-unit';
}

function isPlaceRef(ref: ClaimObjectRef): ref is HistoricalRef<'place'> {
  return ref.space === 'historical' && ref.kind === 'place';
}

function createProjectionIndex(model: AtlasEvidenceModel): ProjectionIndex {
  const records = new Map<string, ProjectionRecord>();
  const observations = new Map<string, Observation>();
  const annotations = new Map<string, Annotation>();

  for (const record of [
    ...model.documentary,
    ...model.textual,
    ...model.historical,
    ...model.digital,
    ...model.observations,
    ...model.annotations,
    ...model.assertions,
  ]) {
    records.set(refKey(record.ref), record);
  }

  for (const observation of model.observations) {
    observations.set(refKey(observation.ref), observation);
  }
  for (const annotation of model.annotations) {
    annotations.set(refKey(annotation.ref), annotation);
  }

  return { records, observations, annotations };
}

function objectReferenceKey(assertion: Assertion): string | null {
  return assertion.object.kind === 'reference'
    ? refKey(assertion.object.ref)
    : null;
}

function collectRelatedAssertions(
  model: AtlasEvidenceModel,
  refs: ReadonlySet<string>,
): {
  readonly outgoing: readonly Assertion[];
  readonly incoming: readonly Assertion[];
  readonly all: readonly Assertion[];
} {
  const outgoing = model.assertions.filter((assertion) =>
    refs.has(refKey(assertion.subject)),
  );
  const incoming = model.assertions.filter((assertion) => {
    const objectKey = objectReferenceKey(assertion);
    return objectKey !== null && refs.has(objectKey);
  });
  const ids = new Set([
    ...outgoing.map((assertion) => refKey(assertion.ref)),
    ...incoming.map((assertion) => refKey(assertion.ref)),
  ]);
  const all = model.assertions.filter((assertion) =>
    ids.has(refKey(assertion.ref)),
  );

  return {
    outgoing: Object.freeze(outgoing),
    incoming: Object.freeze(incoming),
    all: Object.freeze(all),
  };
}

function evidenceForAssertion(
  assertion: Assertion,
  index: ProjectionIndex,
): readonly EvidenceProjectionItem[] {
  if (assertion.provenance.status === 'unavailable') {
    return Object.freeze([]);
  }

  const evidence = assertion.provenance.evidence
    .map((link) => {
      const key = refKey(link.evidence);
      return index.observations.get(key) ?? index.annotations.get(key) ?? null;
    })
    .filter((item): item is EvidenceProjectionItem => item !== null)
    .sort((left, right) => compareRefs(left.ref, right.ref));

  return Object.freeze(evidence);
}

export function projectEvidenceReview(
  model: AtlasEvidenceModel,
  refs: readonly AtlasDomainRef[],
): EvidenceReviewProjection {
  const index = createProjectionIndex(model);
  const relevantKeys = new Set(refs.map(refKey));
  const related = collectRelatedAssertions(model, relevantKeys);
  const provenanceKeys = new Set<string>();

  for (const assertion of related.all) {
    if (assertion.provenance.status !== 'known') {
      continue;
    }
    for (const link of assertion.provenance.evidence) {
      provenanceKeys.add(refKey(link.evidence));
    }
  }

  const observations = model.observations.filter(
    (observation) =>
      relevantKeys.has(refKey(observation.target)) ||
      provenanceKeys.has(refKey(observation.ref)),
  );
  const annotations = model.annotations.filter(
    (annotation) =>
      relevantKeys.has(refKey(annotation.target)) ||
      provenanceKeys.has(refKey(annotation.ref)),
  );
  const assertions: AssertionEvidenceProjection[] = related.all.map(
    (assertion) => ({
      assertion,
      evidence: evidenceForAssertion(assertion, index),
    }),
  );

  return Object.freeze({
    observations: Object.freeze(observations),
    annotations: Object.freeze(annotations),
    assertions: Object.freeze(assertions),
  });
}

function collectSourceParts(
  model: AtlasEvidenceModel,
  source: DocumentarySource,
): readonly SourcePart[] {
  const included = new Set<string>([refKey(source.ref)]);
  const parts: SourcePart[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    for (const record of model.documentary) {
      if (!isSourcePart(record)) {
        continue;
      }
      const key = refKey(record.ref);
      if (included.has(key) || !included.has(refKey(record.parent))) {
        continue;
      }
      included.add(key);
      parts.push(record);
      changed = true;
    }
  }

  return Object.freeze(
    parts.sort((left, right) => compareRefs(left.ref, right.ref)),
  );
}

export function projectSourceDetail(
  model: AtlasEvidenceModel,
  sourceRef: DocumentarySource['ref'],
): SourceDetailProjection | null {
  const source = model.documentary.find(
    (record): record is DocumentarySource =>
      isDocumentarySource(record) && refKey(record.ref) === refKey(sourceRef),
  );
  if (!source) {
    return null;
  }

  const parts = collectSourceParts(model, source);
  const carrierKeys = new Set([
    refKey(source.ref),
    ...parts.map((part) => refKey(part.ref)),
  ]);
  const witnesses = model.textual.filter(
    (record): record is TextWitness =>
      isTextWitness(record) && carrierKeys.has(refKey(record.carrier)),
  );
  const witnessKeys = new Set(witnesses.map((record) => refKey(record.ref)));
  const workKeys = new Set(witnesses.map((record) => refKey(record.work)));
  const works = model.textual.filter(
    (record): record is TextWork =>
      isTextWork(record) && workKeys.has(refKey(record.ref)),
  );
  const editions = model.textual.filter(
    (record): record is TextEdition =>
      isTextEdition(record) && witnessKeys.has(refKey(record.witness)),
  );
  const editionKeys = new Set(editions.map((record) => refKey(record.ref)));
  const units = model.textual.filter(
    (record): record is TextUnit =>
      isTextUnit(record) && editionKeys.has(refKey(record.edition)),
  );
  const relevantRefs: AtlasDomainRef[] = [
    source.ref,
    ...parts.map((record) => record.ref),
    ...works.map((record) => record.ref),
    ...witnesses.map((record) => record.ref),
    ...editions.map((record) => record.ref),
    ...units.map((record) => record.ref),
  ];
  const related = collectRelatedAssertions(
    model,
    new Set(relevantRefs.map(refKey)),
  );

  return Object.freeze({
    source,
    parts: Object.freeze(parts),
    works: Object.freeze(works),
    witnesses: Object.freeze(witnesses),
    editions: Object.freeze(editions),
    units: Object.freeze(units),
    outgoingAssertions: related.outgoing,
    incomingAssertions: related.incoming,
    evidence: projectEvidenceReview(model, relevantRefs),
  });
}

export function projectHistoricalEntityDetail(
  model: AtlasEvidenceModel,
  entityRef: HistoricalEntity['ref'],
): HistoricalEntityDetailProjection | null {
  const entity = model.historical.find(
    (candidate) => refKey(candidate.ref) === refKey(entityRef),
  );
  if (!entity) {
    return null;
  }

  const related = collectRelatedAssertions(
    model,
    new Set([refKey(entity.ref)]),
  );
  return Object.freeze({
    entity,
    outgoingAssertions: related.outgoing,
    incomingAssertions: related.incoming,
    evidence: projectEvidenceReview(model, [entity.ref]),
  });
}

export function projectMapPlaceClaims(
  model: AtlasEvidenceModel,
): readonly MapPlaceClaimFeature[] {
  const features: MapPlaceClaimFeature[] = [];

  for (const assertion of model.assertions) {
    if (
      assertion.object.kind !== 'reference' ||
      !isPlaceRef(assertion.object.ref)
    ) {
      continue;
    }

    features.push(
      Object.freeze({
        id: `map:${refKey(assertion.ref)}`,
        assertion: assertion.ref,
        subject: assertion.subject,
        place: assertion.object.ref,
        ...(assertion.validDuring ? { temporal: assertion.validDuring } : {}),
        ...(assertion.certainty ? { certainty: assertion.certainty } : {}),
        provenance: assertion.provenance,
      }),
    );
  }

  return Object.freeze(features);
}

export function projectTimelineClaims(
  model: AtlasEvidenceModel,
): readonly TimelineClaimEntry[] {
  return Object.freeze(
    model.assertions
      .filter(
        (
          assertion,
        ): assertion is Assertion & {
          validDuring: NonNullable<Assertion['validDuring']>;
        } => assertion.validDuring !== undefined,
      )
      .map((assertion) =>
        Object.freeze({
          id: `timeline:${refKey(assertion.ref)}`,
          assertion: assertion.ref,
          subject: assertion.subject,
          predicate: assertion.predicate,
          temporal: assertion.validDuring,
          ...(assertion.certainty ? { certainty: assertion.certainty } : {}),
          provenance: assertion.provenance,
        }),
      ),
  );
}

function recordLabel(record: SearchProjectionRecord): string {
  if ('label' in record && record.label) {
    return record.label;
  }
  return record.ref.id;
}

function recordSummary(record: SearchProjectionRecord): string | null {
  return 'summary' in record && record.summary ? record.summary : null;
}

function claimSearchText(assertion: Assertion, index: ProjectionIndex): string {
  const values = [assertion.predicate];

  if (assertion.object.kind === 'literal') {
    values.push(String(assertion.object.value.value));
  } else {
    const target = index.records.get(refKey(assertion.object.ref));
    if (target && 'label' in target && target.label) {
      values.push(target.label);
    } else {
      values.push(assertion.object.ref.id);
    }
  }

  if (assertion.validDuring?.label) {
    values.push(assertion.validDuring.label);
  }
  if (assertion.certainty?.note) {
    values.push(assertion.certainty.note);
  }

  return values.join(' ');
}

export function projectSearchDocuments(
  model: AtlasEvidenceModel,
): readonly SearchDocumentProjection[] {
  const index = createProjectionIndex(model);
  const records: SearchProjectionRecord[] = [
    ...model.documentary,
    ...model.textual,
    ...model.historical,
    ...model.digital,
  ];
  records.sort((left, right) => compareRefs(left.ref, right.ref));

  return Object.freeze(
    records.map((record) => {
      const key = refKey(record.ref);
      const assertions = model.assertions.filter(
        (assertion) => refKey(assertion.subject) === key,
      );
      const searchableText = [
        recordLabel(record),
        recordSummary(record),
        ...assertions.map((assertion) => claimSearchText(assertion, index)),
      ]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();

      return Object.freeze({
        id: `search:${key}`,
        ref: record.ref,
        label: recordLabel(record),
        category: `${record.ref.space}:${record.ref.kind}`,
        searchableText,
        assertionRefs: Object.freeze(
          assertions.map((assertion) => assertion.ref),
        ),
      });
    }),
  );
}

export function searchProjectedDocuments(
  documents: readonly SearchDocumentProjection[],
  query: string,
): readonly SearchDocumentProjection[] {
  const tokens = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);

  if (tokens.length === 0) {
    return Object.freeze([...documents]);
  }

  return Object.freeze(
    documents.filter((document) =>
      tokens.every((token) => document.searchableText.includes(token)),
    ),
  );
}
