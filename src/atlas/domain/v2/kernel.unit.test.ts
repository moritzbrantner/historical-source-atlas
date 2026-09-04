import { describe, expect, it } from 'vitest';

import {
  assertionSemanticKey,
  certainty,
  createAtlasEvidenceModel,
  documentaryRef,
  evidenceRef,
  getAssertionsForSubject,
  historicalRef,
  historicalYear,
  knownProvenance,
  refKey,
  temporalQualification,
  textualRef,
  unavailableProvenance,
  type Annotation,
  type Assertion,
  type DocumentarySource,
  type HistoricalEntity,
  type Observation,
  type TextEdition,
  type TextUnit,
  type TextWitness,
  type TextWork,
} from './index';

const source: DocumentarySource = {
  ref: documentaryRef('source', 'source-a'),
  label: 'Source A',
  sourceKind: 'manuscript',
};

const work: TextWork = {
  ref: textualRef('work', 'work-a'),
  label: 'Work A',
};

const witness: TextWitness = {
  ref: textualRef('witness', 'witness-a'),
  label: 'Witness A',
  work: work.ref,
  carrier: source.ref,
};

const edition: TextEdition = {
  ref: textualRef('edition', 'edition-a'),
  label: 'Edition A',
  witness: witness.ref,
  editionKind: 'transcription',
};

const unit: TextUnit = {
  ref: textualRef('text-unit', 'unit-a'),
  edition: edition.ref,
  sequence: 0,
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

const observationOne: Observation = {
  ref: evidenceRef('observation', 'observation-a'),
  target: unit.ref,
  selector: {
    kind: 'text-range',
    unit: unit.ref,
    startOffset: 0,
    endOffset: 12,
  },
};

const observationTwo: Observation = {
  ref: evidenceRef('observation', 'observation-b'),
  target: unit.ref,
  selector: {
    kind: 'locator',
    value: 'margin note',
  },
};

const annotation: Annotation = {
  ref: evidenceRef('annotation', 'annotation-a'),
  target: unit.ref,
  selector: {
    kind: 'text-range',
    unit: unit.ref,
    startOffset: 4,
    endOffset: 18,
  },
  annotationKind: 'translation',
  content: 'Representative translated phrase.',
};

function baseModelInput() {
  return {
    documentary: [source],
    textual: [unit, edition, witness, work],
    historical: [ravenna, person, rome],
    observations: [observationTwo, observationOne],
    annotations: [annotation],
  };
}

describe('evidence-first domain v2', () => {
  it('keeps conflicting assertions instead of canonicalizing them', () => {
    const inRome: Assertion = {
      ref: evidenceRef('assertion', 'claim-rome'),
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
        { evidence: observationOne.ref, stance: 'supports' },
      ]),
    };
    const inRavenna: Assertion = {
      ref: evidenceRef('assertion', 'claim-ravenna'),
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
        { evidence: observationTwo.ref, stance: 'contradicts' },
      ]),
    };

    const model = createAtlasEvidenceModel({
      ...baseModelInput(),
      assertions: [inRavenna, inRome],
    });

    expect(getAssertionsForSubject(model, person.ref)).toHaveLength(2);
    expect(
      getAssertionsForSubject(model, person.ref).map(
        (assertion) => assertion.object,
      ),
    ).toEqual(
      expect.arrayContaining([
        { kind: 'reference', ref: rome.ref },
        { kind: 'reference', ref: ravenna.ref },
      ]),
    );
  });

  it('normalizes model ordering independently of input ordering', () => {
    const first: Assertion = {
      ref: evidenceRef('assertion', 'claim-a'),
      subject: person.ref,
      predicate: 'named-in',
      object: { kind: 'reference', ref: work.ref },
      provenance: knownProvenance([
        { evidence: observationTwo.ref, stance: 'context' },
        { evidence: annotation.ref, stance: 'supports' },
        { evidence: observationOne.ref, stance: 'supports' },
      ]),
    };
    const second: Assertion = {
      ref: evidenceRef('assertion', 'claim-b'),
      subject: person.ref,
      predicate: 'present-at',
      object: { kind: 'reference', ref: rome.ref },
      provenance: unavailableProvenance('Source note was lost.'),
    };

    const forward = createAtlasEvidenceModel({
      ...baseModelInput(),
      assertions: [first, second],
    });
    const reversed = createAtlasEvidenceModel({
      documentary: [...baseModelInput().documentary].reverse(),
      textual: [...baseModelInput().textual].reverse(),
      historical: [...baseModelInput().historical].reverse(),
      observations: [...baseModelInput().observations].reverse(),
      annotations: [...baseModelInput().annotations].reverse(),
      assertions: [second, first],
    });

    expect(forward.documentary.map((record) => refKey(record.ref))).toEqual(
      reversed.documentary.map((record) => refKey(record.ref)),
    );
    expect(forward.textual.map((record) => refKey(record.ref))).toEqual(
      reversed.textual.map((record) => refKey(record.ref)),
    );
    expect(forward.historical.map((record) => refKey(record.ref))).toEqual(
      reversed.historical.map((record) => refKey(record.ref)),
    );
    expect(forward.observations.map((record) => refKey(record.ref))).toEqual(
      reversed.observations.map((record) => refKey(record.ref)),
    );
    expect(forward.annotations.map((record) => refKey(record.ref))).toEqual(
      reversed.annotations.map((record) => refKey(record.ref)),
    );
    expect(forward.assertions.map((record) => refKey(record.ref))).toEqual(
      reversed.assertions.map((record) => refKey(record.ref)),
    );
  });

  it('keeps semantic assertion identity independent of provenance order', () => {
    const left: Assertion = {
      ref: evidenceRef('assertion', 'left'),
      subject: person.ref,
      predicate: 'present-at',
      object: { kind: 'reference', ref: rome.ref },
      validDuring: temporalQualification({
        startYear: 410,
        precision: 'circa',
      }),
      certainty: certainty('probable', 'Approximate dating.'),
      provenance: knownProvenance([
        { evidence: observationOne.ref, stance: 'supports' },
        { evidence: annotation.ref, stance: 'context' },
      ]),
    };
    const right: Assertion = {
      ...left,
      ref: evidenceRef('assertion', 'right'),
      provenance: knownProvenance([
        { evidence: annotation.ref, stance: 'context' },
        { evidence: observationOne.ref, stance: 'supports' },
      ]),
    };

    expect(assertionSemanticKey(left)).toBe(assertionSemanticKey(right));
  });

  it('keeps domain spaces distinct even when raw ids match', () => {
    const sourceRef = documentaryRef('source', 'shared');
    const personRef = historicalRef('person', 'shared');

    expect(refKey(sourceRef)).not.toBe(refKey(personRef));
    expect(sourceRef.space).toBe('documentary');
    expect(personRef.space).toBe('historical');
  });

  it('rejects invalid historical time and provenance', () => {
    expect(() => historicalYear(0)).toThrow(/non-zero integers/);
    expect(() =>
      temporalQualification({
        startYear: 500,
        endYear: 400,
        precision: 'range',
      }),
    ).toThrow(/start must not follow/);
    expect(() => knownProvenance([])).toThrow(/at least one evidence link/);
    expect(() => unavailableProvenance('   ')).toThrow(/requires a reason/);
  });

  it('rejects dangling references at the kernel boundary', () => {
    const danglingAssertion: Assertion = {
      ref: evidenceRef('assertion', 'dangling'),
      subject: historicalRef('person', 'missing-person'),
      predicate: 'present-at',
      object: { kind: 'reference', ref: rome.ref },
      provenance: knownProvenance([
        { evidence: observationOne.ref, stance: 'supports' },
      ]),
    };

    expect(() =>
      createAtlasEvidenceModel({
        ...baseModelInput(),
        assertions: [danglingAssertion],
      }),
    ).toThrow(/references missing historical:person:missing-person/);
  });
});
