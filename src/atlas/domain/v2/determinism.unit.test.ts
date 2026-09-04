import { describe, expect, it } from 'vitest';

import {
  createAtlasEvidenceModel,
  documentaryRef,
  evidenceRef,
  historicalRef,
  knownProvenance,
  textualRef,
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
  ref: documentaryRef('source', 'source'),
  label: 'Source',
  sourceKind: 'manuscript',
};
const work: TextWork = {
  ref: textualRef('work', 'work'),
  label: 'Work',
};
const witness: TextWitness = {
  ref: textualRef('witness', 'witness'),
  label: 'Witness',
  work: work.ref,
  carrier: source.ref,
};
const edition: TextEdition = {
  ref: textualRef('edition', 'edition'),
  label: 'Edition',
  witness: witness.ref,
  editionKind: 'transcription',
};
const unit: TextUnit = {
  ref: textualRef('text-unit', 'unit'),
  edition: edition.ref,
};
const person: HistoricalEntity = {
  ref: historicalRef('person', 'person'),
  label: 'Person',
};
const place: HistoricalEntity = {
  ref: historicalRef('place', 'place'),
  label: 'Place',
};
const observationA: Observation = {
  ref: evidenceRef('observation', 'a'),
  target: unit.ref,
};
const observationB: Observation = {
  ref: evidenceRef('observation', 'b'),
  target: unit.ref,
};

function buildAssertion(evidenceOrder: readonly Observation[]): Assertion {
  return {
    ref: evidenceRef('assertion', 'claim'),
    subject: person.ref,
    predicate: ' present-at ',
    object: { kind: 'reference', ref: place.ref },
    provenance: knownProvenance(
      evidenceOrder.map((observation) => ({
        evidence: observation.ref,
        stance: 'supports' as const,
      })),
      '  two witnesses  ',
    ),
  };
}

function createModel(assertion: Assertion) {
  return createAtlasEvidenceModel({
    documentary: [source],
    textual: [work, witness, edition, unit],
    historical: [person, place],
    observations: [observationB, observationA],
    assertions: [assertion],
  });
}

describe('v2 deterministic normalization', () => {
  it('canonicalizes nested provenance evidence order and text', () => {
    const forward = createModel(buildAssertion([observationA, observationB]));
    const reversed = createModel(buildAssertion([observationB, observationA]));

    expect(forward.assertions).toEqual(reversed.assertions);
    expect(forward.assertions[0]?.predicate).toBe('present-at');
    expect(forward.assertions[0]?.provenance).toMatchObject({
      status: 'known',
      note: 'two witnesses',
    });
  });
});
