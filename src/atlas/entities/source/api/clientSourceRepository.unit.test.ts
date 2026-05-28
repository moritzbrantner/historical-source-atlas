import { describe, expect, it } from 'vitest';

import { httpSourceRepository } from './httpSourceRepository';
import { resolveClientSourceRepository } from './clientSourceRepository';
import { staticSourceRepository } from './staticSourceRepository';

describe('resolveClientSourceRepository', () => {
  it('uses bundled static data for static export builds', () => {
    expect(resolveClientSourceRepository('static')).toBe(
      staticSourceRepository,
    );
  });

  it('uses HTTP API data by default', () => {
    expect(resolveClientSourceRepository()).toBe(httpSourceRepository);
  });
});
