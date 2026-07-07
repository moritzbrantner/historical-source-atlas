import { useEffect, useRef } from 'react';
import {
  ClusterLayer,
  FlowLayer,
  GeoJsonLayer,
  MapControls,
  MapView,
  PointLayer,
  type FlowMapLayerFeature,
  type GeoJsonLayerFeature,
} from '@moritzbrantner/maps/layers';
import { getBoundsFromPoints } from '@moritzbrantner/maps/core';
import type { Map } from 'maplibre-gl';

import type {
  EntityOverlayAreaProperties,
  EntityOverlayCategory,
  EntityOverlayPoint,
} from '../../domain/entityOverlayModel';
import {
  allSourceKinds,
  sourceKindColors,
  sourceKindLabels,
} from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import {
  getFeatureProperties,
  type SourceReferenceFlowProperties,
} from '../../entities/source/lib/sourceReferences';
import { SourcePopup } from './SourcePopup';
import type { AtlasMapProps } from './AtlasMap';

export function AtlasMapClient({
  entityOverlayLayers,
  entityOverlays,
  entityOverlaysError,
  entityOverlaysLoading,
  flows,
  onEntityOverlayLayersChange,
  onSelectSource,
  onViewportBoundsChange,
  referenceDirectionFilters,
  selectedSourceId,
  sourceTagsBySourceId,
  sources,
}: AtlasMapProps) {
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const visibleSourceKinds = allSourceKinds.filter((sourceKind) =>
    sources.some((source) => source.properties.kind === sourceKind),
  );
  const overlayPoints = entityOverlays?.points ?? [];
  const overlayAreas =
    entityOverlays?.areas ??
    ({ features: [], type: 'FeatureCollection' } as const);

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
        defaultViewState={{ center: [24, 35], zoom: 4 }}
        mapLabel="Map of historical source discovery locations"
        onMapReady={(map) => {
          mapRef.current = map;
          reportMapBounds(map, onViewportBoundsChange);
        }}
        onViewStateChange={() => {
          if (mapRef.current) {
            reportMapBounds(mapRef.current, onViewportBoundsChange);
          }
        }}
        style={{ minHeight: 620 }}
      >
        <GeoJsonLayer<EntityOverlayAreaProperties>
          featureCollection={overlayAreas}
          getFeatureId={(feature) => feature.id}
          getFeatureStyle={(feature) => ({
            lineColor:
              feature.properties.evidenceKind === 'dated'
                ? '#a16207'
                : '#78716c',
            lineOpacity: 0.85,
            lineWidth: 1.5,
            polygonFillColor:
              feature.properties.evidenceKind === 'dated'
                ? '#facc15'
                : '#d6d3d1',
            polygonFillOpacity: 0.16,
            polygonStrokeColor:
              feature.properties.evidenceKind === 'dated'
                ? '#a16207'
                : '#78716c',
            polygonStrokeWidth: 1.5,
          })}
          layerId="entity-overlay-countries"
          renderFeaturePopup={(feature) => (
            <CountryOverlayPopup feature={feature} />
          )}
          renderFeatureTooltip={(feature) => feature.properties.label}
        />
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
        <ClusterLayer<EntityOverlayPoint['properties']>
          clusterRadius={56}
          getFeatureId={(feature) =>
            feature.kind === 'cluster'
              ? `entity-cluster-${feature.clusterId}`
              : feature.point.id
          }
          layerId="entity-overlay-points"
          points={overlayPoints}
          renderFeaturePopup={(feature) =>
            feature.kind === 'cluster' ? (
              <EntityOverlayClusterPopup pointCount={feature.pointCount} />
            ) : (
              <EntityOverlayPointPopup point={feature.point} />
            )
          }
          renderFeatureTooltip={(feature) =>
            feature.kind === 'cluster'
              ? `${feature.pointCountAbbreviated} entities`
              : feature.point.label
          }
        />
        <PointLayer<HistoricalSource['properties']>
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
          renderFeaturePopup={(feature) => (
            <SourcePopup
              feature={feature}
              tags={sourceTagsBySourceId.get(feature.point.id) ?? []}
            />
          )}
          renderFeatureTooltip={(feature) => feature.point.label}
          selectedFeatureId={selectedSourceId}
        />

        <MapControls
          aria-label="Entity overlay layers"
          className="grid gap-2 rounded-md border border-slate-200 bg-white/95 p-2 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-900/10"
          position="top-right"
        >
          {entityOverlayOptions.map((option) => (
            <button
              aria-pressed={entityOverlayLayers[option.category]}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-xs font-bold text-slate-700 data-[active=true]:border-slate-900 data-[active=true]:bg-slate-900 data-[active=true]:text-white"
              data-active={entityOverlayLayers[option.category]}
              key={option.category}
              type="button"
              onClick={() => {
                onEntityOverlayLayersChange({
                  ...entityOverlayLayers,
                  [option.category]: !entityOverlayLayers[option.category],
                });
              }}
            >
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: option.color }}
              />
              {option.label}
            </button>
          ))}
          {entityOverlaysLoading ? (
            <span className="text-[11px] font-semibold text-slate-500">
              Updating overlays
            </span>
          ) : null}
          {entityOverlaysError ? (
            <span className="max-w-40 text-[11px] font-semibold text-red-700">
              Could not load entity overlays.
            </span>
          ) : null}
        </MapControls>
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
        {entityOverlayOptions
          .filter((option) => entityOverlayLayers[option.category])
          .map((option) => (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-slate-900/10"
              key={option.category}
            >
              <i
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: option.color }}
              />
              {option.label}
            </span>
          ))}
        {entityOverlayOptions.some(
          (option) => entityOverlayLayers[option.category],
        ) ? (
          <LegendLine color="#78716c" label="Undated fallback" />
        ) : null}
      </div>
    </div>
  );
}

const entityOverlayOptions: {
  category: EntityOverlayCategory;
  color: string;
  label: string;
}[] = [
  { category: 'city', color: '#be123c', label: 'Cities' },
  { category: 'country', color: '#ca8a04', label: 'Countries' },
  { category: 'person', color: '#7c3aed', label: 'People' },
];

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

function EntityOverlayClusterPopup({ pointCount }: { pointCount: number }) {
  return (
    <div className="grid max-w-56 gap-1">
      <strong className="text-sm text-slate-950">
        {pointCount} entities in this area
      </strong>
      <span className="text-sm text-slate-600">
        Zoom in to inspect individual cities and people.
      </span>
    </div>
  );
}

function EntityOverlayPointPopup({
  point,
}: {
  point: {
    label: string;
    properties: EntityOverlayPoint['properties'];
  };
}) {
  const properties = point.properties;

  return (
    <div className="grid max-w-64 gap-1">
      <strong className="text-sm text-slate-950">{point.label}</strong>
      <span className="text-sm capitalize text-slate-600">
        {properties.category}
        {properties.dateLabel ? `, ${properties.dateLabel}` : ''}
      </span>
      {properties.evidenceKind === 'undated_fallback' ? (
        <span className="text-xs font-semibold text-stone-600">
          Undated fallback
        </span>
      ) : null}
      <span className="text-xs text-slate-500">
        {properties.linkedSourceCount} linked sources
      </span>
      <a
        className="text-sm font-semibold text-teal-700 hover:text-teal-900"
        href={properties.routePath}
      >
        Open entity
      </a>
    </div>
  );
}

function CountryOverlayPopup({
  feature,
}: {
  feature: GeoJsonLayerFeature<EntityOverlayAreaProperties>;
}) {
  return (
    <div className="grid max-w-64 gap-1">
      <strong className="text-sm text-slate-950">
        {feature.properties.label}
      </strong>
      <span className="text-sm text-slate-600">
        Country
        {feature.properties.dateLabel
          ? `, ${feature.properties.dateLabel}`
          : ''}
      </span>
      {feature.properties.evidenceKind === 'undated_fallback' ? (
        <span className="text-xs font-semibold text-stone-600">
          Undated fallback
        </span>
      ) : null}
      <span className="text-xs text-slate-500">
        {feature.properties.linkedSourceCount} linked sources
      </span>
      <a
        className="text-sm font-semibold text-teal-700 hover:text-teal-900"
        href={feature.properties.routePath}
      >
        Open entity
      </a>
    </div>
  );
}

function reportMapBounds(
  map: Map,
  onViewportBoundsChange: AtlasMapProps['onViewportBoundsChange'],
) {
  const bounds = map.getBounds();

  onViewportBoundsChange({
    east: clamp(bounds.getEast(), -180, 180),
    north: clamp(bounds.getNorth(), -90, 90),
    south: clamp(bounds.getSouth(), -90, 90),
    west: clamp(bounds.getWest(), -180, 180),
  });
}

function getNearestSourceAtPoint(
  panel: HTMLElement,
  sources: HistoricalSource[],
  clientX: number,
  clientY: number,
) {
  if (sources.length === 0) {
    return null;
  }

  const markers = Array.from(
    panel.querySelectorAll<SVGElement>('.mb-maps__point-marker'),
  ).slice(-sources.length);
  let nearestMarkerIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  markers.forEach((marker, index) => {
    const rect = marker.getBoundingClientRect();
    const markerX = rect.left + rect.width / 2;
    const markerY = rect.top + rect.height / 2;
    const distance = Math.hypot(markerX - clientX, markerY - clientY);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestMarkerIndex = index;
    }
  });

  return nearestDistance <= 28 && nearestMarkerIndex >= 0
    ? sources[nearestMarkerIndex]
    : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
