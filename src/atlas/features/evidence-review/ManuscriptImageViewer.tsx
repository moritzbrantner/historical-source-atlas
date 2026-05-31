'use client';

import { Badge, Button } from '@moritzbrantner/ui';
import { ImageOff, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type {
  EvidenceImageAsset,
  EvidenceLayerId,
  EvidenceOverlay,
} from '../../entities/evidence/model/evidenceTypes';
import { getVisibleManuscriptRegions } from './manuscriptRegions';

const regionColorClassNames: Record<EvidenceLayerId, string> = {
  entities:
    'border-sky-500 bg-sky-400/20 text-sky-950 focus-visible:outline-sky-700',
  important:
    'border-amber-500 bg-amber-300/25 text-amber-950 focus-visible:outline-amber-700',
  notes:
    'border-slate-500 bg-slate-400/20 text-slate-950 focus-visible:outline-slate-700',
  translation:
    'border-teal-500 bg-teal-400/20 text-teal-950 focus-visible:outline-teal-700',
};

export function ManuscriptImageViewer({
  images,
  onSelectOverlay,
  overlays,
  selectedOverlayIds,
  visibleLayerIds,
}: {
  images: EvidenceImageAsset[];
  overlays: EvidenceOverlay[];
  selectedOverlayIds: Set<string>;
  visibleLayerIds: Set<EvidenceLayerId>;
  onSelectOverlay: (overlayIds: string[]) => void;
}) {
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? '');
  const [zoom, setZoom] = useState(1);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (!images.some((image) => image.id === selectedImageId)) {
      setSelectedImageId(images[0]?.id ?? '');
    }
  }, [images, selectedImageId]);

  const selectedImage = useMemo(
    () =>
      images.find((image) => image.id === selectedImageId) ?? images[0] ?? null,
    [images, selectedImageId],
  );

  const visibleRegions = useMemo(
    () =>
      selectedImage
        ? getVisibleManuscriptRegions({
            imageAssetId: selectedImage.id,
            imageAssets: images,
            overlays,
            visibleLayerIds,
          })
        : [],
    [images, overlays, selectedImage, visibleLayerIds],
  );

  if (!selectedImage) {
    return null;
  }

  const imageFailed = failedImageIds.has(selectedImage.id);

  return (
    <section
      aria-label="Manuscript image viewer"
      className="grid min-w-0 gap-3"
      data-testid="manuscript-image-viewer"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>IIIF image</Badge>
          <span className="text-sm font-semibold text-slate-900">
            {selectedImage.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            aria-label="Fit manuscript image"
            onClick={() => {
              setZoom(1);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <Maximize2 aria-hidden="true" size={16} />
          </Button>
          <Button
            aria-label="Zoom out manuscript image"
            onClick={() => {
              setZoom((currentZoom) => Math.max(0.75, currentZoom - 0.25));
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <ZoomOut aria-hidden="true" size={16} />
          </Button>
          <Button
            aria-label="Zoom in manuscript image"
            onClick={() => {
              setZoom((currentZoom) => Math.min(2.5, currentZoom + 0.25));
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <ZoomIn aria-hidden="true" size={16} />
          </Button>
        </div>
      </div>

      {images.length > 1 ? (
        <div
          aria-label="Manuscript pages"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {images.map((image) => (
            <Button
              aria-pressed={image.id === selectedImage.id}
              key={image.id}
              onClick={() => {
                setSelectedImageId(image.id);
                setZoom(1);
              }}
              size="sm"
              type="button"
              variant={image.id === selectedImage.id ? 'secondary' : 'outline'}
            >
              {image.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-100">
        <div
          className="relative min-w-full bg-white"
          style={{
            aspectRatio: `${selectedImage.width} / ${selectedImage.height}`,
            width: `${zoom * 100}%`,
          }}
        >
          {imageFailed ? (
            <MissingImageState image={selectedImage} />
          ) : (
            <>
              <img
                alt={`${selectedImage.label} manuscript page`}
                className="absolute inset-0 h-full w-full object-contain"
                onError={() => {
                  setFailedImageIds((currentFailedImageIds) => {
                    const nextFailedImageIds = new Set(currentFailedImageIds);
                    nextFailedImageIds.add(selectedImage.id);
                    return nextFailedImageIds;
                  });
                }}
                src={selectedImage.localImageUrl}
              />
              {visibleRegions.map(({ overlay, region }) => {
                const isSelected = selectedOverlayIds.has(overlay.id);
                const hasSelection = selectedOverlayIds.size > 0;

                return (
                  <button
                    aria-label={`${overlay.label} image region on ${selectedImage.label}`}
                    aria-pressed={isSelected}
                    className={[
                      'absolute rounded-sm border-2 p-0 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                      regionColorClassNames[overlay.layerId],
                      isSelected ? 'opacity-100 ring-2 ring-slate-950/40' : '',
                      !isSelected && hasSelection ? 'opacity-30' : '',
                      !hasSelection ? 'opacity-60 hover:opacity-90' : '',
                    ].join(' ')}
                    key={region.id}
                    onClick={() => {
                      onSelectOverlay([overlay.id]);
                    }}
                    style={{
                      height: `${(region.height / selectedImage.height) * 100}%`,
                      left: `${(region.x / selectedImage.width) * 100}%`,
                      top: `${(region.y / selectedImage.height) * 100}%`,
                      width: `${(region.width / selectedImage.width) * 100}%`,
                    }}
                    title={overlay.label}
                    type="button"
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function MissingImageState({ image }: { image: EvidenceImageAsset }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-4 text-center">
      <div className="grid max-w-sm gap-3 text-sm text-slate-600">
        <ImageOff
          aria-hidden="true"
          className="mx-auto text-slate-400"
          size={28}
        />
        <p className="m-0 font-medium text-slate-800">
          Manuscript image is not cached locally.
        </p>
        <p className="m-0">
          Run{' '}
          <code className="rounded bg-slate-200 px-1 py-0.5">
            bun scripts/download-manuscript-fixture.ts ...
          </code>{' '}
          to cache this manuscript image locally.
        </p>
        <a
          className="font-semibold text-teal-700 no-underline hover:text-teal-900"
          href={image.sourceImageUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open source IIIF image
        </a>
      </div>
    </div>
  );
}
