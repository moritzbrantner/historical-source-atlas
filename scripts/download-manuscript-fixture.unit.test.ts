import { describe, expect, it } from 'vitest';

import v2Manifest from '../src/atlas/fixtures/iiif/manifest-v2-minimal.json';
import v3Manifest from '../src/atlas/fixtures/iiif/manifest-v3-minimal.json';
import {
  buildIiifImageUrl,
  parseIiifManifest,
  selectIiifCanvases,
} from './download-manuscript-fixture';

describe('download-manuscript-fixture IIIF helpers', () => {
  it('parses IIIF v3 manifests', () => {
    expect(parseIiifManifest(v3Manifest)).toMatchObject({
      attribution: 'Example Library attribution',
      canvases: [
        {
          canvasId: 'https://example.test/iiif/canvas/1',
          height: 800,
          imageServiceId: 'https://example.test/iiif/image3/1',
          label: 'f. 1r',
          width: 1000,
        },
        {
          canvasId: 'https://example.test/iiif/canvas/2',
          height: 900,
          imageServiceId: 'https://example.test/iiif/image3/2',
          label: 'f. 1v',
          width: 1200,
        },
      ],
      manifestId: 'https://example.test/iiif/manifest-v3',
      provider: 'Example Library',
      rights: 'https://creativecommons.org/publicdomain/mark/1.0/',
    });
  });

  it('parses IIIF v2 manifests', () => {
    expect(parseIiifManifest(v2Manifest)).toMatchObject({
      attribution: 'Example Library attribution',
      canvases: [
        {
          canvasId: 'https://example.test/iiif/v2/canvas/1',
          height: 800,
          imageServiceId: 'https://example.test/iiif/v2/image-service/1',
          label: 'f. 1r',
          width: 1000,
        },
      ],
      manifestId: 'https://example.test/iiif/manifest-v2',
      rights: 'https://creativecommons.org/publicdomain/mark/1.0/',
    });
  });

  it('selects canvases by exact normalized label and index', () => {
    const manifest = parseIiifManifest(v3Manifest);

    expect(
      selectIiifCanvases({
        canvasIndexes: [1],
        canvasLabels: ['  f.   1r  '],
        manifest,
      }).map((canvas) => canvas.label),
    ).toEqual(['f. 1r', 'f. 1v']);
  });

  it('rejects duplicate labels', () => {
    const manifest = parseIiifManifest({
      ...v3Manifest,
      items: [v3Manifest.items[0], v3Manifest.items[0]],
    });

    expect(() =>
      selectIiifCanvases({
        canvasIndexes: [],
        canvasLabels: ['f. 1r'],
        manifest,
      }),
    ).toThrow(/matched 2 canvases/);
  });

  it('builds resized IIIF image URLs', () => {
    const manifest = parseIiifManifest(v3Manifest);

    expect(buildIiifImageUrl(manifest.canvases[0]!, 1600)).toBe(
      'https://example.test/iiif/image3/1/full/1600,/0/default.jpg',
    );
  });
});
