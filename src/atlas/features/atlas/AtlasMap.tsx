import { useEffect, useRef } from 'react';
import {
  FlowLayer,
  MapView,
  PointLayer,
  type FlowMapLayerFeature,
} from '@moritzbrantner/maps/layers';
import { getBoundsFromPoints } from '@moritzbrantner/maps/core';

import {
  allSourceKinds,
  sourceKindColors,
  sourceKindLabels,
} from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import {
  getFeatureProperties,
  type HistoricalSourceFeature,
  type SourceReferenceDirection,
  type SourceReferenceFlow,
  type SourceReferenceFlowProperties,
} from '../../entities/source/lib/sourceReferences';

export function AtlasMap({
  flows,
  onSelectSource,
  referenceDirectionFilters,
  selectedSourceId,
  sources,
}: {
  flows: SourceReferenceFlow[];
  onSelectSource: (sourceId: string) => void;
  referenceDirectionFilters: SourceReferenceDirection[];
  selectedSourceId: string | null;
  sources: HistoricalSource[];
}) {
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const visibleSourceKinds = allSourceKinds.filter((sourceKind) =>
    sources.some((source) => source.properties.kind === sourceKind),
  );

  useEffect(() => {
    const panel = mapPanelRef.current;

    if (!panel) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest('.leaflet-control')) {
        return;
      }

      const source = getNearestSourceAtPoint(
        panel,
        sources,
        event.clientX,
        event.clientY,
      );

      if (source) {
        onSelectSource(source.id);
      }
    };

    panel.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      panel.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [onSelectSource, sources]);

  return (
    <div
      className="source-map-panel relative min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 shadow-xl shadow-slate-900/10"
      ref={mapPanelRef}
    >
      <MapView
        dataBounds={getBoundsFromPoints(sources)}
        fitToData={false}
        initialViewState={{ center: [24, 35], zoom: 4 }}
        mapLabel="Map of historical source discovery locations"
        style={{ minHeight: 620 }}
      >
        <FlowLayer<SourceReferenceFlowProperties>
          directionMarker="arrow"
          flowShape="arc"
          flows={flows}
          getFlowColor={(feature) =>
            feature.flow.properties.direction === 'incoming'
              ? '#1d4ed8'
              : '#0f766e'
          }
          maxWidth={3.25}
          minWidth={2.25}
          renderFeaturePopup={(feature) => (
            <SourceReferencePopup feature={feature} />
          )}
          renderFeatureTooltip={(feature) => (
            <SourceReferenceTooltip feature={feature} />
          )}
          showDirection
          showEndpoints
        />
        <PointLayer
          getFeatureId={(feature) => feature.point.id}
          getPointColor={(feature) =>
            sourceKindColors[getFeatureProperties(feature).kind]
          }
          getPointRadius={(feature) =>
            7 + Math.min(8, feature.point.metrics.importance ?? 0)
          }
          onFeatureSelect={(feature) => {
            if (feature) {
              onSelectSource(feature.point.id);
            }
          }}
          points={sources}
          renderFeaturePopup={(feature) => <SourcePopup feature={feature} />}
          renderFeatureTooltip={(feature) => feature.point.label}
          selectedFeatureId={selectedSourceId}
        />
      </MapView>

      <div
        className="pointer-events-none absolute inset-x-4 bottom-4 z-[520] flex flex-wrap gap-2"
        aria-label="Map legend"
      >
        {visibleSourceKinds.map((kind) => (
          <span
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-slate-900/10"
            key={kind}
          >
            <i
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: sourceKindColors[kind] }}
            />
            {sourceKindLabels[kind]}
          </span>
        ))}
        {referenceDirectionFilters.includes('outgoing') ? (
          <LegendLine color="#0f766e" label="References" />
        ) : null}
        {referenceDirectionFilters.includes('incoming') ? (
          <LegendLine color="#1d4ed8" label="Referenced by" />
        ) : null}
      </div>
    </div>
  );
}

export function SourcePopup({ feature }: { feature: HistoricalSourceFeature }) {
  const properties = getFeatureProperties(feature);

  return (
    <div className="grid min-w-52 gap-1">
      <strong className="text-sm text-slate-950">{feature.point.label}</strong>
      <span className="text-sm text-slate-600">{properties.location}</span>
      <span className="text-sm text-slate-600">
        Found: {properties.discovered}
      </span>
    </div>
  );
}

function SourceReferenceTooltip({
  feature,
}: {
  feature: FlowMapLayerFeature<SourceReferenceFlowProperties>;
}) {
  const directionLabel =
    feature.flow.properties.direction === 'incoming'
      ? 'Referenced by'
      : 'References';

  return (
    <div className="grid max-w-64 gap-1">
      <strong className="text-sm text-slate-950">
        {directionLabel}: {feature.flow.properties.label}
      </strong>
      <span className="text-sm text-slate-600">
        {feature.flow.properties.relation}
      </span>
    </div>
  );
}

function SourceReferencePopup({
  feature,
}: {
  feature: FlowMapLayerFeature<SourceReferenceFlowProperties>;
}) {
  const directionLabel =
    feature.flow.properties.direction === 'incoming'
      ? 'Referenced by'
      : 'References';

  return (
    <div className="grid max-w-64 gap-1">
      <strong className="text-sm text-slate-950">
        {directionLabel}: {feature.flow.properties.label}
      </strong>
      <span className="text-sm text-slate-600">
        {feature.flow.properties.relation}
      </span>
      <span className="text-sm text-slate-600">
        {feature.flow.properties.note}
      </span>
    </div>
  );
}

function LegendLine({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-slate-900/10">
      <i className="h-0.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function getNearestSourceAtPoint(
  panel: HTMLElement,
  sources: HistoricalSource[],
  clientX: number,
  clientY: number,
) {
  const markers = Array.from(
    panel.querySelectorAll<SVGElement>('.mb-maps__point-marker'),
  );
  let nearestMarkerIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  markers.forEach((marker, index) => {
    const rect = marker.getBoundingClientRect();
    const markerCenterX = rect.left + rect.width / 2;
    const markerCenterY = rect.top + rect.height / 2;
    const markerRadius = Math.max(rect.width, rect.height) / 2;
    const distance = Math.hypot(
      markerCenterX - clientX,
      markerCenterY - clientY,
    );

    if (distance <= markerRadius + 8 && distance < nearestDistance) {
      nearestDistance = distance;
      nearestMarkerIndex = index;
    }
  });

  return sources[nearestMarkerIndex];
}
