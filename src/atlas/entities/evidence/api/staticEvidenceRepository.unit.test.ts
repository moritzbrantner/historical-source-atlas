import { describe, expect, it } from 'vitest';

import { staticEvidenceRepository } from './staticEvidenceRepository';

describe('staticEvidenceRepository', () => {
  it('returns codex-sinaiticus manuscript evidence', async () => {
    await expect(
      staticEvidenceRepository.getEvidenceBySourceSlug('codex-sinaiticus'),
    ).resolves.toMatchObject({
      imageAssets: expect.any(Array),
      sourceSlug: 'codex-sinaiticus',
    });
  });
});
