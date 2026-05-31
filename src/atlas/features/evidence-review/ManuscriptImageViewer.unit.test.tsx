// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  EvidenceImageAsset,
  EvidenceOverlay,
} from '../../entities/evidence/model/evidenceTypes';
import { ManuscriptImageViewer } from './ManuscriptImageViewer';

afterEach(() => {
  cleanup();
});

describe('ManuscriptImageViewer', () => {
  it('renders visible image regions and selects overlays from image clicks', async () => {
    const user = userEvent.setup();
    const onSelectOverlay = vi.fn();

    render(
      <ManuscriptImageViewer
        images={[imageAsset()]}
        onSelectOverlay={onSelectOverlay}
        overlays={[overlay()]}
        selectedOverlayIds={new Set()}
        visibleLayerIds={new Set(['important'])}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'First line image region on f. 1r',
      }),
    );

    expect(onSelectOverlay).toHaveBeenCalledWith(['overlay-1']);
  });

  it('marks selected regions as pressed', () => {
    render(
      <ManuscriptImageViewer
        images={[imageAsset()]}
        onSelectOverlay={() => {}}
        overlays={[overlay()]}
        selectedOverlayIds={new Set(['overlay-1'])}
        visibleLayerIds={new Set(['important'])}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'First line image region on f. 1r' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides regions for hidden layers', () => {
    render(
      <ManuscriptImageViewer
        images={[imageAsset()]}
        onSelectOverlay={() => {}}
        overlays={[overlay()]}
        selectedOverlayIds={new Set()}
        visibleLayerIds={new Set(['translation'])}
      />,
    );

    expect(
      screen.queryByRole('button', {
        name: 'First line image region on f. 1r',
      }),
    ).not.toBeInTheDocument();
  });

  it('shows a local cache empty state when the image fails to load', () => {
    render(
      <ManuscriptImageViewer
        images={[imageAsset()]}
        onSelectOverlay={() => {}}
        overlays={[overlay()]}
        selectedOverlayIds={new Set()}
        visibleLayerIds={new Set(['important'])}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'f. 1r manuscript page' }));

    expect(
      screen.getByText('Manuscript image is not cached locally.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open source IIIF image' }),
    ).toHaveAttribute('href', 'https://example.test/image.jpg');
  });
});

function imageAsset(): EvidenceImageAsset {
  return {
    attribution: 'The British Library',
    canvasId: 'canvas-1',
    height: 800,
    id: 'image-1',
    label: 'f. 1r',
    localImageUrl: '/atlas-manuscripts/codex-sinaiticus/f-1r.jpg',
    manifestId: 'https://example.test/manifest',
    provider: 'The British Library',
    rights: 'Public Domain',
    sourceImageUrl: 'https://example.test/image.jpg',
    width: 1000,
  };
}

function overlay(): EvidenceOverlay {
  return {
    certainty: null,
    content: 'Line details',
    endOffset: 10,
    id: 'overlay-1',
    imageRegions: [
      {
        coordinateSpace: 'pixel',
        height: 100,
        id: 'region-1',
        imageAssetId: 'image-1',
        width: 200,
        x: 100,
        y: 100,
      },
    ],
    kind: 'highlight',
    label: 'First line',
    layerId: 'important',
    startOffset: 0,
    unitId: 'unit-1',
  };
}
