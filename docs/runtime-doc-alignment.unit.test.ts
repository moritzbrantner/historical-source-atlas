import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const readDoc = (filePath: string) =>
  readFileSync(path.join(process.cwd(), filePath), 'utf8');

const productDocs = [
  'README.md',
  'ARCHITECTURE.md',
  'PRODUCT_BRIEF.md',
  'FEATURES.md',
  'MIGRATION_NOTES.md',
] as const;

describe('historical atlas documentation', () => {
  it('presents the atlas product instead of inherited template claims', () => {
    for (const filePath of productDocs) {
      const text = readDoc(filePath);
      expect(text, filePath).toContain('Historical Source Atlas');
      expect(text, filePath).not.toContain('TanStack Start');
      expect(text, filePath).not.toContain('src/routes/**');
      expect(text, filePath).not.toContain(
        'Reusable Next.js 16 App Router platform template',
      );
    }
    for (const filePath of ['README.md', 'ARCHITECTURE.md', 'DECISIONS.md']) {
      expect(readDoc(filePath), filePath).toContain('Next.js');
    }
  });

  it('preserves historical decisions and the v1/v2 boundary', () => {
    const decisions = readDoc('DECISIONS.md');
    for (const id of [
      'DEC-0001',
      'DEC-0002',
      'DEC-0003',
      'DEC-0004',
      'DEC-0005',
      'DEC-0006',
    ]) {
      expect(decisions).toContain(id);
    }
    expect(readDoc('ARCHITECTURE.md')).toContain('src/atlas/domain/v2/');
    expect(readDoc('PRODUCT_BRIEF.md')).toContain('v1');
    expect(readDoc('MIGRATION_NOTES.md')).toContain('UI cutover remains open');
    expect(
      existsSync(path.join(process.cwd(), 'src/atlas/domain/v2/kernel.ts')),
    ).toBe(true);
  });

  it('keeps the agent pointer and removes superseded template docs', () => {
    expect(readDoc('CLAUDE.md')).toBe('@AGENTS.md\n');
    for (const filePath of [
      'SCAFFOLD_ALIGNMENT.md',
      'docs/adding-an-app-pack.md',
      'docs/profile-image-storage-migration.md',
      'docs/template-boundaries.md',
    ]) {
      expect(existsSync(path.join(process.cwd(), filePath)), filePath).toBe(
        false,
      );
    }
    expect(readDoc('docs/platform-layout.md')).not.toContain(
      '/home/moenarch/moritzbrantner/next-template/',
    );
  });
});
