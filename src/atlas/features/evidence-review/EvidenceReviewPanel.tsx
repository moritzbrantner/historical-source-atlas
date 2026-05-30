'use client';

import {
  LoadingState,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';
import { useEffect, useMemo, useState } from 'react';

import { useEvidenceReviewQuery } from '../../entities/evidence/api/evidenceQueries';
import type { EvidenceRepository } from '../../entities/evidence/api/evidenceRepository';
import type {
  EvidenceLayerId,
  EvidenceOverlay,
} from '../../entities/evidence/model/evidenceTypes';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import { EmptyState } from '../../shared/ui/EmptyState';
import { EvidenceLayerControls } from './EvidenceLayerControls';
import { EvidenceOverlayDetails } from './EvidenceOverlayDetails';
import { EvidenceTextViewer } from './EvidenceTextViewer';
import type { EvidenceTextSegment } from './offsetSegments';

export function EvidenceReviewPanel({
  evidenceRepository,
  source,
}: {
  evidenceRepository?: EvidenceRepository;
  source: HistoricalSource;
}) {
  const evidenceQuery = useEvidenceReviewQuery(source.id, evidenceRepository);
  const evidence = evidenceQuery.data;
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<EvidenceLayerId>>(
    () => new Set(),
  );
  const [selectedOverlays, setSelectedOverlays] = useState<EvidenceOverlay[]>(
    [],
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!evidence) {
      return;
    }

    setVisibleLayerIds(
      new Set(
        evidence.layers
          .filter((layer) => layer.defaultVisible)
          .map((layer) => layer.id),
      ),
    );
    setSelectedOverlays([]);
    setSelectedSegmentId(null);
  }, [evidence]);

  const overlayCount = useMemo(
    () =>
      evidence?.units.reduce(
        (count, unit) => count + unit.overlays.length,
        0,
      ) ?? 0,
    [evidence],
  );

  return (
    <Surface>
      <SurfaceHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SurfaceTitle>Evidence Review</SurfaceTitle>
          {evidence ? (
            <p className="m-0 mt-1 text-sm text-slate-500">
              {evidence.title} · {overlayCount} overlays
            </p>
          ) : null}
        </div>
        {evidence?.units.length ? (
          <EvidenceLayerControls
            layers={evidence.layers}
            onToggleLayer={(layerId) => {
              setVisibleLayerIds((currentLayerIds) => {
                const nextLayerIds = new Set(currentLayerIds);

                if (nextLayerIds.has(layerId)) {
                  nextLayerIds.delete(layerId);
                } else {
                  nextLayerIds.add(layerId);
                }

                return nextLayerIds;
              });
            }}
            visibleLayerIds={visibleLayerIds}
          />
        ) : null}
      </SurfaceHeader>
      <SurfaceContent>
        {evidenceQuery.isLoading ? (
          <LoadingState label="Loading evidence review" />
        ) : null}

        {!evidenceQuery.isLoading &&
        (!evidence || evidence.units.length === 0) ? (
          <EmptyState
            description="No evidence text is available for this source yet."
            title="No evidence text"
          />
        ) : null}

        {evidence?.units.length ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
            <EvidenceTextViewer
              activeLayerIds={visibleLayerIds}
              onSelectSegment={(segment: EvidenceTextSegment) => {
                setSelectedOverlays(segment.overlays);
                setSelectedSegmentId(segment.id);
              }}
              selectedSegmentId={selectedSegmentId}
              units={evidence.units}
            />
            <EvidenceOverlayDetails overlays={selectedOverlays} />
          </div>
        ) : null}
      </SurfaceContent>
    </Surface>
  );
}
