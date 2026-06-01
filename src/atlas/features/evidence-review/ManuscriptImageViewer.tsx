'use client';

import { Badge, Button } from '@moritzbrantner/ui';
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
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
  onSelectImage,
  overlays,
  selectedImageId: controlledSelectedImageId,
  selectedOverlayIds,
  visibleLayerIds,
}: {
  images: EvidenceImageAsset[];
  overlays: EvidenceOverlay[];
  selectedImageId?: string | null;
  selectedOverlayIds: Set<string>;
  visibleLayerIds: Set<EvidenceLayerId>;
  onSelectImage?: (imageId: string) => void;
  onSelectOverlay: (overlayIds: string[]) => void;
}) {
  const [internalSelectedImageId, setInternalSelectedImageId] = useState(
    images[0]?.id ?? '',
  );
  const [zoom, setZoom] = useState(1);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const selectedImageId = controlledSelectedImageId ?? internalSelectedImageId;

  function selectImage(imageId: string) {
    setInternalSelectedImageId(imageId);
    onSelectImage?.(imageId);
  }

  useEffect(() => {
    if (!images.some((image) => image.id === selectedImageId)) {
      const nextImageId = images[0]?.id ?? '';

      setInternalSelectedImageId(nextImageId);
      onSelectImage?.(nextImageId);
    }
  }, [images, onSelectImage, selectedImageId]);

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
  const selectedImageIndex = images.findIndex(
    (image) => image.id === selectedImage.id,
  );
  const pageNumber = Math.max(selectedImageIndex, 0) + 1;

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
          aria-label="Manuscript pagination"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
          role="group"
        >
          <div className="flex items-center gap-2">
            <Button
              aria-label="Previous manuscript page"
              disabled={selectedImageIndex <= 0}
              onClick={() => {
                const previousImage = images[selectedImageIndex - 1];
                if (!previousImage) {
                  return;
                }

                selectImage(previousImage.id);
                setZoom(1);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </Button>
            <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
              Page {pageNumber} of {images.length}
            </span>
            <Button
              aria-label="Next manuscript page"
              disabled={selectedImageIndex >= images.length - 1}
              onClick={() => {
                const nextImage = images[selectedImageIndex + 1];
                if (!nextImage) {
                  return;
                }

                selectImage(nextImage.id);
                setZoom(1);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronRight aria-hidden="true" size={16} />
            </Button>
          </div>
          <select
            aria-label="Manuscript page"
            className="min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            value={selectedImage.id}
            onChange={(event) => {
              selectImage(event.target.value);
              setZoom(1);
            }}
          >
            {images.map((image, index) => (
              <option key={image.id} value={image.id}>
                {index + 1}. {image.label}
              </option>
            ))}
          </select>
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
