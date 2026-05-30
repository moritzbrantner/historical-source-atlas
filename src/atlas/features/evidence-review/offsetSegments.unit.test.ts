import { describe, expect, it } from 'vitest';

import type { EvidenceOverlay } from '../../entities/evidence/model/evidenceTypes';
import { buildEvidenceTextSegments } from './offsetSegments';

describe('buildEvidenceTextSegments', () => {
  it('renders plain text with no overlays', () => {
    expect(
      buildEvidenceTextSegments({
        activeLayerIds: new Set(['important']),
        content: 'Plain text',
        overlays: [],
      }),
    ).toEqual([
      {
        endOffset: 10,
        id: '0-10',
        overlays: [],
        primaryOverlay: null,
        startOffset: 0,
        text: 'Plain text',
      },
    ]);
  });

  it('splits a single overlay span correctly', () => {
    const overlays = [overlay('one', 'important', 6, 10)];

    expect(
      buildEvidenceTextSegments({
        activeLayerIds: new Set(['important']),
        content: 'Alpha beta gamma',
        overlays,
      }).map(compactSegment),
    ).toEqual([
      ['Alpha ', []],
      ['beta', ['one']],
      [' gamma', []],
    ]);
  });

  it('handles adjacent overlays', () => {
    const overlays = [
      overlay('first', 'important', 0, 5),
      overlay('second', 'entities', 5, 9),
    ];

    expect(
      buildEvidenceTextSegments({
        activeLayerIds: new Set(['important', 'entities']),
        content: 'alphabeta',
        overlays,
      }).map(compactSegment),
    ).toEqual([
      ['alpha', ['first']],
      ['beta', ['second']],
    ]);
  });

  it('handles overlapping overlays deterministically', () => {
    const overlays = [
      overlay('important', 'important', 0, 9),
      overlay('translation', 'translation', 5, 13),
      overlay('entity', 'entities', 9, 13),
    ];

    expect(
      buildEvidenceTextSegments({
        activeLayerIds: new Set(['important', 'translation', 'entities']),
        content: 'alpha beta one',
        overlays,
      }).map((segment) => ({
        overlays: segment.overlays.map((segmentOverlay) => segmentOverlay.id),
        primary: segment.primaryOverlay?.id ?? null,
        text: segment.text,
      })),
    ).toEqual([
      { overlays: ['important'], primary: 'important', text: 'alpha' },
      {
        overlays: ['important', 'translation'],
        primary: 'translation',
        text: ' bet',
      },
      {
        overlays: ['translation', 'entity'],
        primary: 'translation',
        text: 'a on',
      },
      { overlays: [], primary: null, text: 'e' },
    ]);
  });

  it('drops invalid offsets', () => {
    const overlays = [
      overlay('valid', 'important', 0, 5),
      overlay('negative', 'important', -1, 5),
      overlay('empty', 'important', 4, 4),
      overlay('outside', 'important', 0, 100),
    ];

    expect(
      buildEvidenceTextSegments({
        activeLayerIds: new Set(['important']),
        content: 'alpha beta',
        overlays,
      }).map(compactSegment),
    ).toEqual([
      ['alpha', ['valid']],
      [' beta', []],
    ]);
  });

  it('preserves UTF-16 slicing behavior', () => {
    const content = 'A 𐐷 B';
    const overlays = [overlay('deseret', 'important', 2, 4)];

    expect(
      buildEvidenceTextSegments({
        activeLayerIds: new Set(['important']),
        content,
        overlays,
      }).map(compactSegment),
    ).toEqual([
      ['A ', []],
      ['𐐷', ['deseret']],
      [' B', []],
    ]);
  });
});

function compactSegment(segment: {
  overlays: EvidenceOverlay[];
  text: string;
}) {
  return [
    segment.text,
    segment.overlays.map((segmentOverlay) => segmentOverlay.id),
  ] as const;
}

function overlay(
  id: string,
  layerId: EvidenceOverlay['layerId'],
  startOffset: number,
  endOffset: number,
): EvidenceOverlay {
  return {
    certainty: null,
    content: `${id} content`,
    endOffset,
    id,
    kind: layerId === 'translation' ? 'translation' : 'highlight',
    label: id,
    layerId,
    startOffset,
    unitId: 'unit',
  };
}
