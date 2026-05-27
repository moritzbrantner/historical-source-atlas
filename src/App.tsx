import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

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
type TimelineMode = "discovery" | "source";
type HistoricalSourceFeature = PointMapFeature<HistoricalSource["properties"]>;

const discoveryYears = historicalSources.map((source) => source.properties.discoveredYear);
const earliestDiscoveryYear = Math.min(...discoveryYears);
const latestDiscoveryYear = Math.max(...discoveryYears);
const sourceYears = historicalSources.map((source) => source.properties.sourceYear);
const earliestSourceYear = Math.min(...sourceYears);
const latestSourceYear = Math.max(...sourceYears);

const timelineModes: Record<
  TimelineMode,
  {
    label: string;
    maxYear: number;
    minYear: number;
    title: string;
  }
> = {
  discovery: {
    label: "Discovery time",
    maxYear: latestDiscoveryYear,
    minYear: earliestDiscoveryYear,
    title: "Sources known by",
  },
  source: {
    label: "Source date",
    maxYear: latestSourceYear,
    minYear: earliestSourceYear,
    title: "Sources dated by",
  },
};

export function App() {
  const [selectedSourceId, setSelectedSourceId] = useState("dead-sea-scrolls");
  const [kindFilter, setKindFilter] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("discovery");
  const mapPanelRef = useRef<HTMLDivElement | null>(null);
  const visibleSourcesRef = useRef<HistoricalSource[]>([]);
  const [timelineYears, setTimelineYears] = useState<Record<TimelineMode, number>>({
    discovery: latestDiscoveryYear,
    source: latestSourceYear,
  });
  const timelineYear = timelineYears[timelineMode];
  const activeTimelineMode = timelineModes[timelineMode];
  const selectedSourceClassName = "ring-2 ring-teal-600 ring-offset-1 ring-offset-white shadow-sm";

  const visibleSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return historicalSources.filter((source) => {
      const matchesKind = kindFilter === "all" || source.properties.kind === kindFilter;
      const matchesTimeline = getTimelineYear(source, timelineMode) <= timelineYear;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          source.label,
          source.properties.discovered,
          source.properties.location,
          source.properties.period,
          source.properties.references,
          source.properties.referencedIn,
          source.properties.region,
          source.properties.summary,
        ]
          .flatMap((value) =>
            Array.isArray(value)
              ? value.flatMap((entry) => [entry.label, entry.note, entry.relation])
              : [value],
          )
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesKind && matchesTimeline && matchesQuery;
    });
  }, [kindFilter, query, timelineMode, timelineYear]);

  const sortedVisibleSources = useMemo(
    () =>
      [...visibleSources].sort(
        (a, b) =>
          getTimelineYear(a, timelineMode) - getTimelineYear(b, timelineMode) ||
          a.label.localeCompare(b.label),
      ),
    [timelineMode, visibleSources],
  );

  const selectedSource =
    visibleSources.find((source) => source.id === selectedSourceId) ?? sortedVisibleSources[0];

  const sourceStats = useMemo(() => {
    const regions = new Set(visibleSources.map((source) => source.properties.region));
    const manuscripts = visibleSources.filter(
      (source) => source.properties.kind === "manuscript",
    ).length;

    return {
      manuscripts,
      regions: regions.size,
      total: visibleSources.length,
    };
  }, [visibleSources]);

  useEffect(() => {
    visibleSourcesRef.current = visibleSources;
  }, [visibleSources]);

  const selectSource = useCallback((sourceId: string) => {
    flushSync(() => {
      setSelectedSourceId(sourceId);
    });
  }, []);

  const selectNearestSourceAtPoint = useCallback(
    (panel: HTMLElement, clientX: number, clientY: number) => {
      const markers = Array.from(panel.querySelectorAll<SVGElement>(".mb-maps__point-marker"));
      let nearestMarkerIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;

      markers.forEach((marker, index) => {
        const rect = marker.getBoundingClientRect();
        const markerCenterX = rect.left + rect.width / 2;
        const markerCenterY = rect.top + rect.height / 2;
        const markerRadius = Math.max(rect.width, rect.height) / 2;
        const distance = Math.hypot(markerCenterX - clientX, markerCenterY - clientY);

        if (distance <= markerRadius + 8 && distance < nearestDistance) {
          nearestDistance = distance;
          nearestMarkerIndex = index;
        }
      });

      const nearestSource = visibleSourcesRef.current[nearestMarkerIndex];

      if (nearestSource) {
        selectSource(nearestSource.id);
      }
    },
    [selectSource],
  );

  useEffect(() => {
    const panel = mapPanelRef.current;

    if (!panel) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest(".leaflet-control")) {
        return;
      }

      selectNearestSourceAtPoint(panel, event.clientX, event.clientY);
    };

    panel.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      panel.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [selectNearestSourceAtPoint]);

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

      <TimelineControl
        mode={timelineMode}
        maxYear={activeTimelineMode.maxYear}
        minYear={activeTimelineMode.minYear}
        onModeChange={setTimelineMode}
        sourceCount={visibleSources.length}
        timelineYear={timelineYear}
        onTimelineYearChange={(year) => {
          setTimelineYears((current) => ({ ...current, [timelineMode]: year }));
        }}
      />

      <section className="source-layout" aria-label="Historical source map">
        <div className="source-map-panel" ref={mapPanelRef}>
          <PointMap
            fitToData={false}
            getFeatureId={(feature) => feature.point.id}
            getPointColor={(feature) => sourceKindColors[getFeatureProperties(feature).kind]}
            getPointRadius={(feature) => 7 + Math.min(8, feature.point.metrics.importance ?? 0)}
            initialViewState={{ center: [24, 35], zoom: 4 }}
            mapLabel="Map of historical source discovery locations"
            onFeatureSelect={(feature) => {
              if (feature) {
                selectSource(feature.point.id);
              }
            }}
            points={visibleSources}
            renderFeaturePopup={(feature) => <SourcePopup feature={feature} />}
            renderFeatureTooltip={(feature) => feature.point.label}
            selectedFeatureId={selectedSource?.id ?? null}
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
              {sortedVisibleSources.map((source) => (
                <Button
                  key={source.id}
                  type="button"
                  variant={source.id === selectedSource?.id ? "default" : "secondary"}
                  aria-pressed={source.id === selectedSource?.id}
                  {...(source.id === selectedSource?.id
                    ? { className: selectedSourceClassName }
                    : {})}
                  onClick={() => {
                    selectSource(source.id);
                  }}
                >
                  <span>{source.label}</span>
                  <small>{getTimelineLabel(source, timelineMode)}</small>
                </Button>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function TimelineControl({
  maxYear,
  minYear,
  mode,
  onModeChange,
  onTimelineYearChange,
  sourceCount,
  timelineYear,
}: {
  maxYear: number;
  minYear: number;
  mode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
  onTimelineYearChange: (year: number) => void;
  sourceCount: number;
  timelineYear: number;
}) {
  const activeTimelineMode = timelineModes[mode];

  return (
    <section className="source-timeline" aria-label="Timeline controls">
      <div className="source-timeline__header">
        <div>
          <span>{activeTimelineMode.label} timeline</span>
          <strong>
            {activeTimelineMode.title} {formatTimelineYear(timelineYear, mode)}
          </strong>
        </div>
        <Badge>{sourceCount} visible</Badge>
      </div>
      <label className="source-timeline__mode">
        <span>Use</span>
        <NativeSelect
          value={mode}
          onChange={(event) => {
            onModeChange(event.target.value as TimelineMode);
          }}
        >
          <option value="discovery">Discovery time</option>
          <option value="source">Source date</option>
        </NativeSelect>
      </label>
      <label className="source-timeline__slider">
        <span>{formatTimelineYear(minYear, mode)}</span>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step={1}
          value={timelineYear}
          onChange={(event) => {
            onTimelineYearChange(Number(event.target.value));
          }}
        />
        <span>{formatTimelineYear(maxYear, mode)}</span>
      </label>
      <div className="source-timeline__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onTimelineYearChange(minYear);
          }}
        >
          Start
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            onTimelineYearChange(maxYear);
          }}
        >
          Show all
        </Button>
      </div>
    </section>
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

function SourceDetail({ source }: { source: HistoricalSource | undefined }) {
  if (!source) {
    return (
      <section className="source-detail source-empty">
        <h2>No sources visible</h2>
        <p>Move the timeline forward or adjust the type and search filters.</p>
      </section>
    );
  }

  return (
    <section className="source-detail">
      <div className="source-detail__header">
        <Badge>{sourceKindLabels[source.properties.kind]}</Badge>
        <span>{source.properties.region}</span>
      </div>
      <h2>{source.label}</h2>
      <p>{source.properties.summary}</p>
      <dl className="source-detail__facts">
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
      <section className="source-detail__section">
        <h3>How and where it was found</h3>
        <p>{source.properties.discoveryContext}</p>
      </section>
      <SourceRelationList title="Where it is referenced" items={source.properties.referencedIn} />
      <SourceRelationList title="What it references" items={source.properties.references} />
    </section>
  );
}

function SourceRelationList({
  items,
  title,
}: {
  items: HistoricalSource["properties"]["references"];
  title: string;
}) {
  return (
    <section className="source-detail__section">
      <h3>{title}</h3>
      <ul className="source-relations">
        {items.map((item) => (
          <li key={`${item.relation}-${item.label}`}>
            <strong>{item.label}</strong>
            <span>{item.relation}</span>
            <p>{item.note}</p>
          </li>
        ))}
      </ul>
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

function getTimelineYear(source: HistoricalSource, mode: TimelineMode) {
  return mode === "discovery" ? source.properties.discoveredYear : source.properties.sourceYear;
}

function getTimelineLabel(source: HistoricalSource, mode: TimelineMode) {
  return mode === "discovery" ? source.properties.discovered : source.properties.period;
}

function formatTimelineYear(year: number, mode: TimelineMode) {
  if (mode === "discovery") {
    return `${year}`;
  }

  if (year < 0) {
    return `${Math.abs(year)} BC`;
  }

  return `${year} AD`;
}
