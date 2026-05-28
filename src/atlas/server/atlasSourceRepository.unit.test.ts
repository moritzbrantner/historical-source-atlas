import { describe, expect, it } from 'vitest';

import { splitRelationRow } from './atlasSourceRepository';

describe('splitRelationRow', () => {
  it('maps referenced-in predicates to incoming source relationships', () => {
    expect(
      splitRelationRow({
        note: 'Catalogued by cave and fragment number.',
        object_label: 'Qumran cave inventories',
        predicate: 'referenced in: catalogued as',
        slug: 'dead-sea-scrolls',
      }),
    ).toEqual({
      direction: 'referencedIn',
      relationship: {
        label: 'Qumran cave inventories',
        note: 'Catalogued by cave and fragment number.',
        relation: 'catalogued as',
      },
    });
  });

  it('keeps ordinary predicates as outgoing references', () => {
    expect(
      splitRelationRow({
        note: 'The decree praises the king.',
        object_label: 'Ptolemy V Epiphanes',
        predicate: 'commemorates',
        slug: 'rosetta-stone',
      }),
    ).toEqual({
      direction: 'references',
      relationship: {
        label: 'Ptolemy V Epiphanes',
        note: 'The decree praises the king.',
        relation: 'commemorates',
      },
    });
  });
});
