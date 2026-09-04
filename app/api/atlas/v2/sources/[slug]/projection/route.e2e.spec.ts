import { expect, test } from '@playwright/test';

test('projects a seeded source through the v1-to-v2 read seam', async ({
  request,
}) => {
  const response = await request.get(
    '/api/atlas/v2/sources/rosetta-stone/projection',
  );

  expect(response.ok()).toBe(true);

  const projection = (await response.json()) as {
    source: {
      ref: { space: string; kind: string; id: string };
      label: string;
    };
    parts: Array<{
      ref: { space: string; kind: string; id: string };
      parent: { space: string; kind: string; id: string };
    }>;
    outgoingAssertions: Array<{
      predicate: string;
      object: unknown;
      validDuring?: { startYear?: number; label?: string };
      provenance: { status: string };
    }>;
  };

  expect(projection.source).toMatchObject({
    ref: {
      space: 'documentary',
      kind: 'source',
      id: 'rosetta-stone',
    },
    label: 'Rosetta Stone',
  });
  expect(projection.parts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ref: expect.objectContaining({ id: 'rosetta-stone-object' }),
        parent: expect.objectContaining({ id: 'rosetta-stone' }),
      }),
      expect.objectContaining({
        ref: expect.objectContaining({ id: 'rosetta-stone-inscription' }),
        parent: expect.objectContaining({ id: 'rosetta-stone-object' }),
      }),
    ]),
  );
  expect(projection.outgoingAssertions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        predicate: 'associated-place',
        object: {
          kind: 'reference',
          ref: {
            space: 'historical',
            kind: 'place',
            id: 'rosetta-stone-place',
          },
        },
        provenance: { status: 'unavailable' },
      }),
      expect.objectContaining({
        predicate: 'dated-to',
        validDuring: expect.objectContaining({
          startYear: -196,
          label: '196 BC',
        }),
        provenance: { status: 'unavailable' },
      }),
    ]),
  );
});

test('returns 404 for an unknown v2 source projection', async ({ request }) => {
  const response = await request.get(
    '/api/atlas/v2/sources/not-a-seeded-source/projection',
  );

  expect(response.status()).toBe(404);
});
