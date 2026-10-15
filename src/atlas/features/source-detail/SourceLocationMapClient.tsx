'use client';

import { Component, useEffect, useId, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';

import { MapView, PointLayer } from '@moritzbrantner/maps/layers';

import { sourceKindColors } from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import { getFeatureProperties } from '../../entities/source/lib/sourceReferences';
import { SourcePopup } from '../atlas/SourcePopup';
import { getSourceMapBackend, type SourceMapBackend } from './mapBackend';

type SourceMapViewState = NonNullable<
  ComponentProps<typeof MapView>['initialViewState']
>;

class SourceMapRendererErrorBoundary extends Component<
  { backend: SourceMapBackend; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[330px] content-center gap-2 bg-white p-4 text-sm text-slate-900" role="alert">
          <strong>
            {this.props.backend === 'maps'
              ? 'First-party Maps could not render this location.'
              : 'MapLibre could not render this location.'}
          </strong>
          <p>{this.state.error.message}</p>
          <p>Select the other map engine above to try it instead.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function SourceLocationMapClient({
  source,
}: {
  source: HistoricalSource;
}) {
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const initialViewStateRef = useRef<SourceMapViewState>({
    center: [source.longitude, source.latitude],
    zoom: 5,
  });
  const selectId = useId();
  const [selection, setSelection] = useState(() =>
    typeof window === 'undefined'
      ? getSourceMapBackend('')
      : getSourceMapBackend(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setSelection(getSourceMapBackend(window.location.search));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    wrapper?.querySelector('.mb-maps')?.removeAttribute('aria-label');
    wrapper?.setAttribute(
      'data-map-view-state',
      JSON.stringify(initialViewStateRef.current),
    );
  }, [selection.backend]);

  const changeBackend = (next: SourceMapBackend) => {
    const url = new URL(window.location.href);
    url.searchParams.set('mapBackend', next);
    window.history.pushState(
      window.history.state,
      '',
      url.pathname + url.search + url.hash,
    );
    setSelection({ backend: next, unsupportedValue: null });
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700" htmlFor={selectId}>
          Map engine
        </label>
        <select
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          id={selectId}
          onChange={(event) =>
            changeBackend(event.currentTarget.value as SourceMapBackend)
          }
          value={selection.backend}
        >
          <option value="maplibre">MapLibre (default)</option>
          <option value="maps">Maps (experimental)</option>
        </select>
      </div>
      {selection.unsupportedValue !== null ? (
        <p className="text-xs text-amber-900" role="status">
          Unsupported mapBackend value; showing MapLibre instead.
        </p>
      ) : null}
      <div
        aria-label={source.label + ' discovery location'}
        className="source-page-map overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-xl shadow-slate-900/10"
        data-map-backend={selection.backend}
        ref={mapWrapperRef}
        role="group"
      >
        <SourceMapRendererErrorBoundary
          backend={selection.backend}
          key={selection.backend}
        >
          <MapView
            fitToData={false}
            flatRuntime={selection.backend}
            initialViewState={initialViewStateRef.current}
            mapLabel={source.label + ' discovery location'}
            onViewStateChange={(viewState) => {
              initialViewStateRef.current = viewState;
              mapWrapperRef.current?.setAttribute(
                'data-map-view-state',
                JSON.stringify(viewState),
              );
            }}
            style={{ minHeight: 330 }}
          >
            <PointLayer<HistoricalSource['properties']>
              getFeatureId={(feature) => feature.point.id}
              getPointColor={(feature) =>
                sourceKindColors[getFeatureProperties(feature).kind]
              }
              getPointRadius={() => 13}
              points={[source]}
              renderFeaturePopup={(feature) => <SourcePopup feature={feature} />}
              renderFeatureTooltip={(feature) => feature.point.label}
              selectedFeatureId={source.id}
            />
          </MapView>
        </SourceMapRendererErrorBoundary>
      </div>
    </div>
  );
}
