import { Badge } from '@moritzbrantner/ui';
import Link from 'next/link';

import { getEntityPath } from '../../app/entityRouting';
import type { EntityType } from '../../domain/dataModel';
import type {
  EvidenceImageAsset,
  EvidenceOverlay,
} from '../../entities/evidence/model/evidenceTypes';

export function EvidenceOverlayDetails({
  imageAssets = [],
  overlays,
}: {
  imageAssets?: EvidenceImageAsset[];
  overlays: EvidenceOverlay[];
}) {
  if (overlays.length === 0) {
    return (
      <aside
        aria-label="Selected evidence overlay details"
        className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        Select a highlighted passage to review its evidence layer details.
      </aside>
    );
  }

  const linkedImageAssets = getLinkedImageAssets(overlays, imageAssets);

  return (
    <aside
      aria-label="Selected evidence overlay details"
      className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {overlays.map((overlay) => (
        <section className="grid gap-2" key={overlay.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{overlay.kind}</Badge>
            <h4 className="m-0 text-sm font-semibold text-slate-900">
              {overlay.label}
            </h4>
          </div>
          {overlay.content ? (
            <p className="m-0 text-sm leading-6 text-slate-700">
              {overlay.content}
            </p>
          ) : null}
          {overlay.targetEntityLabel ? (
            <p className="m-0 text-xs font-semibold uppercase text-slate-500">
              {overlay.targetEntityType ?? 'entity'}:{' '}
              {overlay.targetEntitySlug && overlay.targetEntityType ? (
                <Link
                  className="text-slate-700 no-underline hover:text-teal-700"
                  href={getEntityPath({
                    agentKind:
                      overlay.targetEntityType === 'agent'
                        ? 'person'
                        : undefined,
                    slug: overlay.targetEntitySlug,
                    type: overlay.targetEntityType as EntityType,
                  })}
                >
                  {overlay.targetEntityLabel}
                </Link>
              ) : (
                overlay.targetEntityLabel
              )}
            </p>
          ) : null}
          {overlay.certainty ? (
            <p className="m-0 text-xs text-slate-500">
              Certainty: {overlay.certainty}
            </p>
          ) : null}
        </section>
      ))}
      {linkedImageAssets.length ? (
        <section className="grid gap-2 border-t border-slate-200 pt-3">
          <h4 className="m-0 text-sm font-semibold text-slate-900">
            Image evidence
          </h4>
          {linkedImageAssets.map((imageAsset) => (
            <div className="grid gap-1" key={imageAsset.id}>
              <p className="m-0 text-sm text-slate-700">
                Canvas: {imageAsset.label}
              </p>
              {imageAsset.attribution || imageAsset.rights ? (
                <p className="m-0 text-xs text-slate-500">
                  {[imageAsset.attribution, imageAsset.rights]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
              <p className="m-0 flex flex-wrap gap-2 text-xs font-semibold">
                <a
                  className="text-teal-700 no-underline hover:text-teal-900"
                  href={imageAsset.sourceImageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Source image
                </a>
                <a
                  className="text-teal-700 no-underline hover:text-teal-900"
                  href={imageAsset.manifestId}
                  rel="noreferrer"
                  target="_blank"
                >
                  IIIF manifest
                </a>
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </aside>
  );
}

function getLinkedImageAssets(
  overlays: EvidenceOverlay[],
  imageAssets: EvidenceImageAsset[],
) {
  const imageAssetsById = new Map(
    imageAssets.map((imageAsset) => [imageAsset.id, imageAsset]),
  );
  const linkedImageAssetsById = new Map<string, EvidenceImageAsset>();

  for (const overlay of overlays) {
    for (const region of overlay.imageRegions ?? []) {
      const imageAsset = imageAssetsById.get(region.imageAssetId);

      if (imageAsset) {
        linkedImageAssetsById.set(imageAsset.id, imageAsset);
      }
    }
  }

  return Array.from(linkedImageAssetsById.values());
}
