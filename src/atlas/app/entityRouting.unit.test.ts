import { describe, expect, it } from 'vitest';

import { getEntityPath, getEntityRouteType } from './entityRouting';

describe('entityRouting', () => {
  it.each([
    [{ type: 'agent' as const, agentKind: 'person' }, 'persons'],
    [{ type: 'agent' as const, agentKind: 'repository' }, 'agents'],
    [{ type: 'place' as const }, 'locations'],
    [{ type: 'event' as const }, 'events'],
    [{ type: 'text_work' as const }, 'texts'],
    [{ type: 'text_witness' as const }, 'texts'],
    [{ type: 'text_edition' as const }, 'texts'],
    [{ type: 'manuscript_unit' as const }, 'manuscripts'],
    [{ type: 'inscription' as const }, 'inscriptions'],
    [{ type: 'physical_object' as const }, 'objects'],
    [{ type: 'object_part' as const }, 'objects'],
    [{ type: 'asset' as const }, 'assets'],
    [{ type: 'catalog_record' as const }, 'entities'],
  ])('maps %o to %s', (entity, routeType) => {
    expect(getEntityRouteType(entity)).toBe(routeType);
  });

  it('builds encoded atlas entity paths', () => {
    expect(
      getEntityPath({
        agentKind: 'person',
        slug: 'teacher of righteousness',
        type: 'agent',
      }),
    ).toBe('/atlas/persons/teacher%20of%20righteousness');
  });
});
