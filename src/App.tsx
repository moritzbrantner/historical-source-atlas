import { useMemo, useState } from "react";

import { Badge, Button, NativeSelect } from "@moritzbrantner/ui";
import { PointMap, type PointMapFeature } from "@moritzbrantner/maps";

import {
  historicalSources,
  sourceKindColors,
  sourceKindLabels,
  type HistoricalSource,
  type SourceKind,
} from "./sources";

type SourceFilter = SourceKind | "all";
type HistoricalSourceFeature = PointMapFeature<HistoricalSource["properties"]>;

export function App() {
  const [selectedSourceId, setSelectedSourceId] = useState("dead-sea-scrolls");
  const [kindFilter, setKindFilter] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");

  const visibleSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return historicalSources.filter((source) => {
      const matchesKind = kindFilter === "all" || source.properties.kind === kindFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          source.label,
          source.properties.location,
          source.properties.period,
          source.properties.region,
          source.properties.summary,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesKind && matchesQuery;
    });
  }, [kindFilter, query]);

  const selectedSource =
    visibleSources.find((source) => source.id === selectedSourceId) ??
    visibleSources[0] ??
    historicalSources[0]!;

  const sourceStats = useMemo(() => {
    const regions = new Set(visibleSources.map((source) => source.properties.region));
    const manuscripts = visibleSources.filter((source) => source.properties.kind === "manuscript").length;

    return {
      manuscripts,
      regions: regions.size,
      total: visibleSources.length,
    };
  }, [visibleSources]);

  return (
    <main className="source-app">
      <header className="source-hero">
        <div>
          <p className="source-kicker">Historical source atlas</p>
          <h1>Map the places where texts and artifacts entered the record.</h1>
        </div>
        <div className="source-controls" aria-label="Source filters">
          <label className="source-field">
            <span>Type</span>
            <NativeSelect
              value={kindFilter}
              onChange={(event) => {
                setKindFilter(event.target.value as SourceFilter);
              }}
            >
              <option value="all">All sources</option>
              <option value="text">Texts</option>
              <option value="artifact">Artifacts</option>
              <option value="inscription">Inscriptions</option>
              <option value="manuscript">Manuscripts</option>
            </NativeSelect>
          </label>
          <label className="source-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder="Qumran, papyri, Iran..."
            />
          </label>
        </div>
      </header>

      <section className="source-layout" aria-label="Historical source map">
        <div className="source-map-panel">
          <PointMap
            fitToData={false}
            getFeatureId={(feature) => feature.point.id}
            getPointColor={(feature) => sourceKindColors[getFeatureProperties(feature).kind]}
            getPointRadius={(feature) => 7 + Math.min(8, feature.point.metrics.importance ?? 0)}
            initialViewState={{ center: [24, 35], zoom: 4 }}
            mapLabel="Map of historical source discovery locations"
            onFeatureSelect={(feature) => {
              if (feature) {
                setSelectedSourceId(feature.point.id);
              }
            }}
            points={visibleSources}
            renderFeaturePopup={(feature) => <SourcePopup feature={feature} />}
            renderFeatureTooltip={(feature) => feature.point.label}
            selectedFeatureId={selectedSource.id}
            style={{ minHeight: 620 }}
          />
          <div className="source-legend" aria-label="Map legend">
            {Object.entries(sourceKindLabels).map(([kind, label]) => (
              <span key={kind}>
                <i style={{ background: sourceKindColors[kind as SourceKind] }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <aside className="source-sidebar" aria-label="Source details">
          <section className="source-summary">
            <Stat value={sourceStats.total} label="visible sources" />
            <Stat value={sourceStats.regions} label="regions" />
            <Stat value={sourceStats.manuscripts} label="manuscripts" />
          </section>

          <SourceDetail source={selectedSource} />

          <section className="source-list" aria-label="Source list">
            <h2>Sources</h2>
            <div>
              {visibleSources.map((source) => (
                <Button
                  key={source.id}
                  type="button"
                  variant={source.id === selectedSource.id ? "default" : "secondary"}
                  onClick={() => {
                    setSelectedSourceId(source.id);
                  }}
                >
                  <span>{source.label}</span>
                  <small>{source.properties.discovered}</small>
                </Button>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{value}</span>
      <p>{label}</p>
    </div>
  );
}

function SourceDetail({ source }: { source: HistoricalSource }) {
  return (
    <section className="source-detail">
      <div className="source-detail__header">
        <Badge>{sourceKindLabels[source.properties.kind]}</Badge>
        <span>{source.properties.region}</span>
      </div>
      <h2>{source.label}</h2>
      <p>{source.properties.summary}</p>
      <dl>
        <div>
          <dt>Found</dt>
          <dd>{source.properties.location}</dd>
        </div>
        <div>
          <dt>Discovery</dt>
          <dd>{source.properties.discovered}</dd>
        </div>
        <div>
          <dt>Source date</dt>
          <dd>{source.properties.period}</dd>
        </div>
        <div>
          <dt>Repository</dt>
          <dd>{source.properties.currentRepository}</dd>
        </div>
      </dl>
    </section>
  );
}

function SourcePopup({ feature }: { feature: HistoricalSourceFeature }) {
  const properties = getFeatureProperties(feature);

  return (
    <div className="source-popup">
      <strong>{feature.point.label}</strong>
      <span>{properties.location}</span>
      <span>Found: {properties.discovered}</span>
    </div>
  );
}

function getFeatureProperties(feature: HistoricalSourceFeature) {
  return feature.point.properties ?? historicalSources[0]!.properties;
}
