import { describe, expect, it } from 'vitest';

import {
  certainty,
  createAtlasEvidenceModel,
  documentaryRef,
  evidenceRef,
  historicalRef,
  knownProvenance,
  projectEvidenceReview,
  projectHistoricalEntityDetail,
  projectMapPlaceClaims,
  projectSearchDocuments,
  projectSourceDetail,
  projectTimelineClaims,
  refKey,
  searchProjectedDocuments,
  temporalQualification,
  textualRef,
  type Annotation,
  type Assertion,
  type DocumentarySource,
  type HistoricalEntity,
  type Observation,
  type SourcePart,
  type TextEdition,
  type TextUnit,
  type TextWitness,
  type TextWork,
} from '../index';

const source: DocumentarySource = {
  ref: documentaryRef('source', 'source-a'),
  label: 'Source A',
  sourceKind: 'manuscript',
  summary: 'A manuscript source with a documented discovery context.',
};

const part: SourcePart = {
  ref: documentaryRef('source-part', 'source-a-part'),
  label: 'Source A fragment',
  parent: source.ref,
};

const work: TextWork = {
  ref: textualRef('work', 'work-a'),
  label: 'Work A',
};

const witness: TextWitness = {
  ref: textualRef('witness', 'witness-a'),
  label: 'Witness A',
  work: work.ref,
  carrier: part.ref,
};

const edition: TextEdition = {
  ref: textualRef('edition', 'edition-a'),
  label: 'Edition A',
  witness: witness.ref,
  editionKind: 'transcription',
};

const unit: TextUnit = {
  ref: textualRef('text-unit', 'unit-a'),
  label: 'Unit A',
  edition: edition.ref,
  sequence: 1,
};

const person: HistoricalEntity = {
  ref: historicalRef('person', 'person-a'),
  label: 'Person A',
};

const rome: HistoricalEntity = {
  ref: historicalRef('place', 'rome'),
  label: 'Rome',
};

const ravenna: HistoricalEntity = {
  ref: historicalRef('place', 'ravenna'),
  label: 'Ravenna',
};

const observation: Observation = {
  ref: evidenceRef('observation', 'observation-a'),
  target: unit.ref,
  selector: {
    kind: 'text-range',
    unit: unit.ref,
    startOffset: 0,
    endOffset: 9,
  },
  note: 'The source explicitly names the place.',
};

const annotation: Annotation = {
  ref: evidenceRef('annotation', 'annotation-a'),
  target: unit.ref,
  annotationKind: 'translation',
  content: 'Alternative reading points to Ravenna.',
};

const sourceDiscovery: Assertion = {
  ref: evidenceRef('assertion', 'source-discovery'),
  subject: source.ref,
  predicate: 'discovered-at',
  object: { kind: 'reference', ref: rome.ref },
  validDuring: temporalQualification({
    startYear: 1947,
    precision: 'year',
  }),
  provenance: knownProvenance([
    { evidence: observation.ref, stance: 'supports' },
  ]),
};

const personInRome: Assertion = {
  ref: evidenceRef('assertion', 'person-in-rome'),
  subject: person.ref,
  predicate: 'present-at',
  object: { kind: 'reference', ref: rome.ref },
  validDuring: temporalQualification({
    startYear: 410,
    endYear: 410,
    precision: 'year',
  }),
  certainty: certainty('probable'),
  provenance: knownProvenance([
    { evidence: observation.ref, stance: 'supports' },
  ]),
};

const personInRavenna: Assertion = {
  ref: evidenceRef('assertion', 'person-in-ravenna'),
  subject: person.ref,
  predicate: 'present-at',
  object: { kind: 'reference', ref: ravenna.ref },
  validDuring: temporalQualification({
    startYear: 410,
    endYear: 410,
    precision: 'year',
  }),
  certainty: certainty('possible'),
  provenance: knownProvenance([
    { evidence: annotation.ref, stance: 'supports' },
    { evidence: observation.ref, stance: 'contradicts' },
  ]),
};

const workMentionsPerson: Assertion = {
  ref: evidenceRef('assertion', 'work-mentions-person'),
  subject: work.ref,
  predicate: 'mentions',
  object: { kind: 'reference', ref: person.ref },
  provenance: knownProvenance([
    { evidence: observation.ref, stance: 'supports' },
  ]),
};

function createFixture(reverse = false) {
  const documentary = [source, part];
  const textual = [work, witness, edition, unit];
  const historical = [person, rome, ravenna];
  const observations = [observation];
  const annotations = [annotation];
  const assertions = [
    sourceDiscovery,
    personInRome,
    personInRavenna,
    workMentionsPerson,
  ];

  return createAtlasEvidenceModel({
    documentary: reverse ? [...documentary].reverse() : documentary,
    textual: reverse ? [...textual].reverse() : textual,
    historical: reverse ? [...historical].reverse() : historical,
    observations: reverse ? [...observations].reverse() : observations,
    annotations: reverse ? [...annotations].reverse() : annotations,
    assertions: reverse ? [...assertions].reverse() : assertions,
  });
}

describe('v2 atlas projections', () => {
  it('projects source detail through documentary and textual relationships', () => {
    const model = createFixture();
    const detail = projectSourceDetail(model, source.ref);

    expect(detail).not.toBeNull();
    expect(detail?.parts.map((record) => refKey(record.ref))).toEqual([
      refKey(part.ref),
    ]);
    expect(detail?.works.map((record) => refKey(record.ref))).toEqual([
      refKey(work.ref),
    ]);
    expect(detail?.witnesses.map((record) => refKey(record.ref))).toEqual([
      refKey(witness.ref),
    ]);
    expect(detail?.editions.map((record) => refKey(record.ref))).toEqual([
      refKey(edition.ref),
    ]);
    expect(detail?.units.map((record) => refKey(record.ref))).toEqual([
      refKey(unit.ref),
    ]);
    expect(
      detail?.outgoingAssertions.map((assertion) => refKey(assertion.ref)),
    ).toEqual(
      expect.arrayContaining([
        refKey(sourceDiscovery.ref),
        refKey(workMentionsPerson.ref),
      ]),
    );
    expect(detail?.evidence.observations).toContainEqual(observation);
  });

  it('preserves conflicting claims in entity detail, map, and timeline projections', () => {
    const model = createFixture();
    const detail = projectHistoricalEntityDetail(model, person.ref);

    expect(detail?.outgoingAssertions).toHaveLength(2);
    expect(
      detail?.outgoingAssertions.map((assertion) =>
        assertion.object.kind === 'reference'
          ? refKey(assertion.object.ref)
          : assertion.object.value.value,
      ),
    ).toEqual(expect.arrayContaining([refKey(rome.ref), refKey(ravenna.ref)]));

    const personMapClaims = projectMapPlaceClaims(model).filter(
      (feature) => refKey(feature.subject) === refKey(person.ref),
    );
    expect(personMapClaims).toHaveLength(2);
    expect(personMapClaims.map((feature) => refKey(feature.place))).toEqual(
      expect.arrayContaining([refKey(rome.ref), refKey(ravenna.ref)]),
    );

    const personTimelineClaims = projectTimelineClaims(model).filter(
      (entry) => refKey(entry.subject) === refKey(person.ref),
    );
    expect(personTimelineClaims).toHaveLength(2);
    expect(
      personTimelineClaims.every((entry) => entry.temporal.startYear === 410),
    ).toBe(true);
  });

  it('links evidence review assertions back to observations and annotations', () => {
    const review = projectEvidenceReview(createFixture(), [person.ref]);

    expect(review.observations).toContainEqual(observation);
    expect(review.annotations).toContainEqual(annotation);
    const ravennaClaim = review.assertions.find(
      ({ assertion }) => refKey(assertion.ref) === refKey(personInRavenna.ref),
    );
    expect(ravennaClaim?.evidence.map((item) => refKey(item.ref))).toEqual([
      refKey(annotation.ref),
      refKey(observation.ref),
    ]);
  });

  it('creates deterministic search documents without treating claims as canonical facts', () => {
    const documents = projectSearchDocuments(createFixture());
    const results = searchProjectedDocuments(documents, 'ravenna');

    expect(results.map((document) => refKey(document.ref))).toEqual(
      expect.arrayContaining([refKey(person.ref), refKey(ravenna.ref)]),
    );
    const personDocument = documents.find(
      (document) => refKey(document.ref) === refKey(person.ref),
    );
    expect(personDocument?.assertionRefs.map(refKey)).toEqual(
      expect.arrayContaining([
        refKey(personInRome.ref),
        refKey(personInRavenna.ref),
      ]),
    );
  });

  it('produces identical projections for semantically equivalent input orderings', () => {
    const forward = createFixture(false);
    const reversed = createFixture(true);

    expect(projectSourceDetail(forward, source.ref)).toEqual(
      projectSourceDetail(reversed, source.ref),
    );
    expect(projectHistoricalEntityDetail(forward, person.ref)).toEqual(
      projectHistoricalEntityDetail(reversed, person.ref),
    );
    expect(projectMapPlaceClaims(forward)).toEqual(
      projectMapPlaceClaims(reversed),
    );
    expect(projectTimelineClaims(forward)).toEqual(
      projectTimelineClaims(reversed),
    );
    expect(projectSearchDocuments(forward)).toEqual(
      projectSearchDocuments(reversed),
    );
    expect(projectEvidenceReview(forward, [person.ref])).toEqual(
      projectEvidenceReview(reversed, [person.ref]),
    );
  });

  it('returns explicit absence instead of guessing an unknown source or entity', () => {
    const model = createFixture();

    expect(
      projectSourceDetail(model, documentaryRef('source', 'missing-source')),
    ).toBeNull();
    expect(
      projectHistoricalEntityDetail(
        model,
        historicalRef('person', 'missing-person'),
      ),
    ).toBeNull();
  });
});
