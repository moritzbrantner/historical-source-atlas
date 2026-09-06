import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpSourceDetailProjectionRepository } from './httpSourceDetailProjectionRepository';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HTTP source detail projection repository', () => {
  it('uses the v2 projection endpoint and returns its projection', async () => {
    const payload = {
      source: {
        ref: { space: 'documentary', kind: 'source', id: 'source a' },
      },
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const repository = httpSourceDetailProjectionRepository;
    const result = await repository.getSourceDetailProjection('source a');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/atlas/v2/sources/source%20a/projection',
      { headers: { accept: 'application/json' } },
    );
    expect(result).toEqual(payload);
  });

  it('maps a missing projection to null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    await expect(
      httpSourceDetailProjectionRepository.getSourceDetailProjection('missing'),
    ).resolves.toBeNull();
  });
});
