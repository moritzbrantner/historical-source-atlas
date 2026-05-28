import { describe, expect, it } from 'vitest';

import {
  getInitialProfileTagCandidates,
  parseProfileTagSegment,
} from '@/src/profile/tags';

describe('profile tags', () => {
  it('parses direct tag segments', () => {
    expect(parseProfileTagSegment('@alice')).toBe('alice');
  });

  it('parses URL-encoded tag segments', () => {
    expect(parseProfileTagSegment('%40alice')).toBe('alice');
  });

  it('rejects malformed tag segments', () => {
    expect(parseProfileTagSegment('alice')).toBeNull();
    expect(parseProfileTagSegment('%E0%A4%A')).toBeNull();
  });

  it('builds tag candidates without an email address', () => {
    const candidates = getInitialProfileTagCandidates({
      userId: 'user_123',
      email: null,
      name: 'Casey Carter',
      username: 'casey_handle',
    });

    expect(candidates).toContain('casey-carter');
    expect(candidates).toContain('casey_handle');
    expect(
      candidates.some((candidate) => candidate.startsWith('uuser123')),
    ).toBe(true);
  });
});
