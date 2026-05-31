import { useEffect, useRef } from 'react';
import { MapView, PointLayer } from '@moritzbrantner/maps/layers';

import { sourceKindColors } from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import { getFeatureProperties } from '../../entities/source/lib/sourceReferences';
import { SourcePopup } from '../atlas/SourcePopup';

export function SourceLocationMapClient({
  source,
}: {
  source: HistoricalSource;
}) {
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    const mapRoot = wrapper?.querySelector('.mb-maps');

    mapRoot?.removeAttribute('aria-label');
  }, []);

  return (
    <div
      aria-label={`${source.label} discovery location`}
      className="source-page-map overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-xl shadow-slate-900/10"
      ref={mapWrapperRef}
      role="group"
    >
      <MapView
        fitToData={false}
        initialViewState={{
          center: [source.longitude, source.latitude],
          zoom: 5,
        }}
        mapLabel={`${source.label} discovery location`}
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
    </div>
  );
}
