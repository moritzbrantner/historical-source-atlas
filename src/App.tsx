import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Badge, Button, NativeSelect } from "@moritzbrantner/ui";
import {
  FlowLayer,
  MapView,
  PointLayer,
  PointMap,
  getBoundsFromPoints,
  type FlowMapLayerFeature,
  type PointMapFeature,
} from "@moritzbrantner/maps";

import {
  historicalSources,
  sourceKindColors,
  sourceKindLabels,
  type HistoricalSource,
  type SourceKind,
} from "./sources";

type SourceFilter = SourceKind | "all";
type TimelineMode = "discovery" | "source";
type PageRoute =
  | {
      view: "atlas";
    }
  | {
      sourceId: string;
      view: "source";
    };
type HistoricalSourceFeature = PointMapFeature<HistoricalSource["properties"]>;
type SourceReferenceDirection = "incoming" | "outgoing";
type SourceReferenceFlowProperties = {
  direction: SourceReferenceDirection;
  label: string;
  note: string;
  relation: string;
};
type SourceReferenceFlow = {
  from: [longitude: number, latitude: number];
  id: string;
  label: string;
  metrics: {
    weight: number;
  };
  properties: SourceReferenceFlowProperties;
  to: [longitude: number, latitude: number];
};

const discoveryYears = historicalSources.map((source) => source.properties.discoveredYear);
const earliestDiscoveryYear = Math.min(...discoveryYears);
const latestDiscoveryYear = Math.max(...discoveryYears);
const sourceYears = historicalSources.map((source) => source.properties.sourceYear);
const earliestSourceYear = Math.min(...sourceYears);
const latestSourceYear = Math.max(...sourceYears);
const sourceById = new Map(historicalSources.map((source) => [source.id, source]));
const sourceReferenceLocations = new Map<string, [longitude: number, latitude: number]>([
  ["Qumran cave inventories", [35.458, 31.741]],
  ["Biblical manuscript studies", [35.214, 31.768]],
  ["Hebrew Bible traditions", [35.214, 31.768]],
  ["Qumran community rules", [35.458, 31.741]],
  ["Decipherment histories", [2.352, 48.857]],
  ["British Museum catalogues", [-0.127, 51.519]],
  ["Ptolemy V Epiphanes", [29.919, 31.2]],
  ["Greek, Demotic, and hieroglyphic scripts", [31.236, 30.044]],
  ["Nag Hammadi codex editions", [31.236, 30.044]],
  ["Early Christian studies", [29.919, 31.2]],
  ["Gnostic revelation dialogues", [32.241, 26.052]],
  ["Platonic and biblical language", [29.919, 31.2]],
  ["Oxyrhynchus Papyri volumes", [-1.258, 51.752]],
  ["Classical and documentary papyrology", [-1.258, 51.752]],
  ["Greek literature", [23.728, 37.984]],
  ["Daily administration", [30.652, 28.535]],
  ["Derveni Papyrus editions", [22.944, 40.64]],
  ["Greek philosophy and religion", [23.728, 37.984]],
  ["Orphic poem", [22.919, 40.682]],
  ["Ritual and cosmology", [22.919, 40.682]],
  ["Tabulae Vindolandenses", [-0.127, 51.519]],
  ["Roman Britain histories", [-0.127, 51.519]],
  ["Roman frontier administration", [-2.36, 54.991]],
  ["Personal correspondence", [-2.36, 54.991]],
  ["Shipwreck excavation records", [23.307, 35.862]],
  ["History of science studies", [23.728, 37.984]],
  ["Astronomical cycles", [28.228, 36.434]],
  ["Greek month and festival calendars", [23.728, 37.984]],
  ["Cuneiform decipherment histories", [-0.127, 51.519]],
  ["Achaemenid royal inscription corpora", [52.892, 29.935]],
  ["Darius I's accession", [47.436, 34.386]],
  ["Old Persian, Elamite, and Babylonian", [48.257, 32.19]],
  ["El-Amarna tablet editions", [13.405, 52.52]],
  ["Late Bronze Age studies", [30.9, 27.65]],
  ["Near Eastern rulers", [30.9, 27.65]],
  ["Tribute, marriage, and military requests", [30.9, 27.65]],
  ["New Testament critical apparatuses", [7.625, 51.96]],
  ["Codex Sinaiticus project records", [-0.127, 51.519]],
  ["Greek Christian Bible", [33.973, 28.539]],
  ["Early Christian book production", [29.919, 31.2]],
  ["Old Babylonian law studies", [44.421, 32.536]],
  ["Louvre Near Eastern collections", [2.336, 48.861]],
  ["Hammurabi's kingship", [44.421, 32.536]],
  ["Legal cases and penalties", [44.421, 32.536]],
  ["Herculaneum papyri catalogues", [14.268, 40.852]],
  ["Epicurean philosophy studies", [23.728, 37.984]],
  ["Philodemus and Epicurean texts", [14.348, 40.806]],
  ["Roman elite library culture", [14.348, 40.806]],
]);

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
  const [route, setRoute] = useState<PageRoute>(() => readRoute());
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
  const selectedSourceReferenceFlows = useMemo(
    () => (selectedSource ? createSourceReferenceFlows(selectedSource) : []),
    [selectedSource],
  );

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

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readRoute());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const selectSource = useCallback((sourceId: string) => {
    flushSync(() => {
      setSelectedSourceId(sourceId);
    });
  }, []);

  const openAtlas = useCallback(() => {
    window.history.pushState(null, "", "/");
    setRoute({ view: "atlas" });
  }, []);

  const openSourcePage = useCallback(
    (sourceId: string) => {
      flushSync(() => {
        setSelectedSourceId(sourceId);
        setRoute({ sourceId, view: "source" });
      });
      window.history.pushState(null, "", getSourcePath(sourceId));
    },
    [setSelectedSourceId],
  );

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

  if (route.view === "source") {
    return (
      <SourcePage
        source={sourceById.get(route.sourceId)}
        onBackToAtlas={openAtlas}
        onOpenSource={openSourcePage}
      />
    );
  }

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
          <MapView
            dataBounds={getBoundsFromPoints(visibleSources)}
            fitToData={false}
            initialViewState={{ center: [24, 35], zoom: 4 }}
            mapLabel="Map of historical source discovery locations"
            style={{ minHeight: 620 }}
          >
            <FlowLayer<SourceReferenceFlowProperties>
              directionMarker="arrow"
              flowShape="arc"
              flows={selectedSourceReferenceFlows}
              getFlowColor={(feature) =>
                feature.flow.properties.direction === "incoming" ? "#1d4ed8" : "#0f766e"
              }
              maxWidth={3.25}
              minWidth={2.25}
              renderFeaturePopup={(feature) => <SourceReferencePopup feature={feature} />}
              renderFeatureTooltip={(feature) => <SourceReferenceTooltip feature={feature} />}
              showDirection
              showEndpoints
            />
            <PointLayer
              getFeatureId={(feature) => feature.point.id}
              getPointColor={(feature) => sourceKindColors[getFeatureProperties(feature).kind]}
              getPointRadius={(feature) => 7 + Math.min(8, feature.point.metrics.importance ?? 0)}
              onFeatureSelect={(feature) => {
                if (feature) {
                  selectSource(feature.point.id);
                }
              }}
              points={visibleSources}
              renderFeaturePopup={(feature) => <SourcePopup feature={feature} />}
              renderFeatureTooltip={(feature) => feature.point.label}
              selectedFeatureId={selectedSource?.id ?? null}
            />
          </MapView>
          <div className="source-legend" aria-label="Map legend">
            {Object.entries(sourceKindLabels).map(([kind, label]) => (
              <span key={kind}>
                <i style={{ background: sourceKindColors[kind as SourceKind] }} />
                {label}
              </span>
            ))}
            <span className="source-legend__relation">
              <i style={{ background: "#0f766e" }} />
              References
            </span>
            <span className="source-legend__relation">
              <i style={{ background: "#1d4ed8" }} />
              Referenced by
            </span>
          </div>
        </div>

        <aside className="source-sidebar" aria-label="Source details">
          <section className="source-summary">
            <Stat value={sourceStats.total} label="visible sources" />
            <Stat value={sourceStats.regions} label="regions" />
            <Stat value={sourceStats.manuscripts} label="manuscripts" />
          </section>

          <SourceDetail source={selectedSource} onOpenPage={openSourcePage} />

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

function SourceDetail({
  onOpenPage,
  source,
}: {
  onOpenPage: (sourceId: string) => void;
  source: HistoricalSource | undefined;
}) {
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
      <div className="source-detail__actions">
        <Button
          type="button"
          onClick={() => {
            onOpenPage(source.id);
          }}
        >
          Open source page
        </Button>
      </div>
    </section>
  );
}

function SourcePage({
  onBackToAtlas,
  onOpenSource,
  source,
}: {
  onBackToAtlas: () => void;
  onOpenSource: (sourceId: string) => void;
  source: HistoricalSource | undefined;
}) {
  if (!source) {
    return (
      <main className="source-page source-page--empty">
        <nav className="source-page__nav" aria-label="Source page navigation">
          <Button type="button" variant="secondary" onClick={onBackToAtlas}>
            Back to atlas
          </Button>
        </nav>
        <section className="source-page__not-found">
          <p className="source-kicker">Source page</p>
          <h1>Source not found</h1>
          <p>Select a source from the atlas to open its detailed page.</p>
          <div className="source-page__quick-list">
            {historicalSources.map((historicalSource) => (
              <button
                key={historicalSource.id}
                type="button"
                onClick={() => {
                  onOpenSource(historicalSource.id);
                }}
              >
                {historicalSource.label}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const relatedRegionalSources = historicalSources
    .filter(
      (candidate) =>
        candidate.id !== source.id && candidate.properties.region === source.properties.region,
    )
    .slice(0, 3);

  return (
    <main className="source-page">
      <nav className="source-page__nav" aria-label="Source page navigation">
        <Button type="button" variant="secondary" onClick={onBackToAtlas}>
          Back to atlas
        </Button>
        <a href={getSourcePath(source.id)}>{getSourcePath(source.id)}</a>
      </nav>

      <header className="source-page__hero">
        <div className="source-page__intro">
          <div className="source-page__badges">
            <Badge>{sourceKindLabels[source.properties.kind]}</Badge>
            <span>{source.properties.region}</span>
          </div>
          <h1>{source.label}</h1>
          <p>{source.properties.summary}</p>
        </div>
        <dl className="source-page__facts" aria-label={`${source.label} facts`}>
          <div>
            <dt>Location</dt>
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
      </header>

      <section className="source-page__grid" aria-label={`${source.label} source page`}>
        <article className="source-page__main">
          <section className="source-page__section">
            <h2>Detailed Information</h2>
            <p>{source.properties.discoveryContext}</p>
            <div className="source-page__metrics">
              <Stat value={source.metrics.importance} label="atlas weight" />
              <Stat value={source.properties.referencedIn.length} label="referenced by" />
              <Stat value={source.properties.references.length} label="references" />
            </div>
          </section>

          <section className="source-page__section">
            <h2>Reference Network</h2>
            <div className="source-network">
              <ReferenceColumn
                items={source.properties.referencedIn}
                title="Referenced by"
                tone="incoming"
              />
              <div className="source-network__node">
                <span
                  aria-hidden="true"
                  style={{ background: sourceKindColors[source.properties.kind] }}
                />
                <strong>{source.label}</strong>
                <p>{source.properties.period}</p>
              </div>
              <ReferenceColumn
                items={source.properties.references}
                title="References"
                tone="outgoing"
              />
            </div>
          </section>
        </article>

        <aside
          className="source-page__aside"
          aria-label={`${source.label} map and related sources`}
        >
          <section className="source-page__map">
            <PointMap
              fitToData={false}
              getFeatureId={(feature) => feature.point.id}
              getPointColor={(feature) => sourceKindColors[getFeatureProperties(feature).kind]}
              getPointRadius={() => 13}
              initialViewState={{ center: [source.longitude, source.latitude], zoom: 5 }}
              mapLabel={`${source.label} discovery location`}
              points={[source]}
              renderFeaturePopup={(feature) => <SourcePopup feature={feature} />}
              renderFeatureTooltip={(feature) => feature.point.label}
              selectedFeatureId={source.id}
              style={{ minHeight: 330 }}
            />
          </section>

          <section className="source-page__section source-page__related">
            <h2>Atlas Context</h2>
            <dl>
              <div>
                <dt>Region</dt>
                <dd>{source.properties.region}</dd>
              </div>
              <div>
                <dt>Discovery year</dt>
                <dd>{source.properties.discoveredYear}</dd>
              </div>
              <div>
                <dt>Source year</dt>
                <dd>{formatTimelineYear(source.properties.sourceYear, "source")}</dd>
              </div>
            </dl>
            {relatedRegionalSources.length > 0 ? (
              <div className="source-page__quick-list">
                {relatedRegionalSources.map((relatedSource) => (
                  <button
                    key={relatedSource.id}
                    type="button"
                    onClick={() => {
                      onOpenSource(relatedSource.id);
                    }}
                  >
                    <span>{relatedSource.label}</span>
                    <small>{relatedSource.properties.period}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}

function ReferenceColumn({
  items,
  title,
  tone,
}: {
  items: HistoricalSource["properties"]["references"];
  title: string;
  tone: "incoming" | "outgoing";
}) {
  return (
    <section className={`source-network__column source-network__column--${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={`${title}-${item.relation}-${item.label}`}>
            <span>{item.relation}</span>
            <strong>{item.label}</strong>
            <p>{item.note}</p>
          </li>
        ))}
      </ul>
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

function SourceReferenceTooltip({
  feature,
}: {
  feature: FlowMapLayerFeature<SourceReferenceFlowProperties>;
}) {
  const directionLabel =
    feature.flow.properties.direction === "incoming" ? "Referenced by" : "References";

  return (
    <div className="source-popup source-reference-popup">
      <strong>
        {directionLabel}: {feature.flow.properties.label}
      </strong>
      <span>{feature.flow.properties.relation}</span>
    </div>
  );
}

function SourceReferencePopup({
  feature,
}: {
  feature: FlowMapLayerFeature<SourceReferenceFlowProperties>;
}) {
  const directionLabel =
    feature.flow.properties.direction === "incoming" ? "Referenced by" : "References";

  return (
    <div className="source-popup source-reference-popup">
      <strong>
        {directionLabel}: {feature.flow.properties.label}
      </strong>
      <span>{feature.flow.properties.relation}</span>
      <span>{feature.flow.properties.note}</span>
    </div>
  );
}

function getFeatureProperties(feature: HistoricalSourceFeature) {
  return feature.point.properties ?? historicalSources[0]!.properties;
}

function createSourceReferenceFlows(source: HistoricalSource): SourceReferenceFlow[] {
  return [
    ...source.properties.referencedIn.map((relationship, index) =>
      createSourceReferenceFlow(source, relationship, "incoming", index),
    ),
    ...source.properties.references.map((relationship, index) =>
      createSourceReferenceFlow(source, relationship, "outgoing", index),
    ),
  ].filter((flow): flow is SourceReferenceFlow => flow !== null);
}

function createSourceReferenceFlow(
  source: HistoricalSource,
  relationship: HistoricalSource["properties"]["references"][number],
  direction: SourceReferenceDirection,
  index: number,
): SourceReferenceFlow | null {
  const referenceCoordinates = sourceReferenceLocations.get(relationship.label);

  if (!referenceCoordinates) {
    return null;
  }

  const sourceCoordinates: [number, number] = [source.longitude, source.latitude];
  const targetCoordinates = offsetCoincidentReferenceCoordinate(
    sourceCoordinates,
    referenceCoordinates,
    direction,
    index,
  );

  return {
    from: direction === "incoming" ? targetCoordinates : sourceCoordinates,
    id: `${source.id}-${direction}-${slugifyReferenceLabel(relationship.label)}`,
    label: relationship.label,
    metrics: {
      weight: 1,
    },
    properties: {
      direction,
      label: relationship.label,
      note: relationship.note,
      relation: relationship.relation,
    },
    to: direction === "incoming" ? sourceCoordinates : targetCoordinates,
  };
}

function offsetCoincidentReferenceCoordinate(
  sourceCoordinates: [longitude: number, latitude: number],
  targetCoordinates: [longitude: number, latitude: number],
  direction: SourceReferenceDirection,
  index: number,
): [longitude: number, latitude: number] {
  if (
    Math.abs(sourceCoordinates[0] - targetCoordinates[0]) > 0.001 ||
    Math.abs(sourceCoordinates[1] - targetCoordinates[1]) > 0.001
  ) {
    return targetCoordinates;
  }

  const angle = ((index * 64 + (direction === "incoming" ? 28 : 156)) * Math.PI) / 180;
  const distance = 0.58;

  return [
    targetCoordinates[0] + Math.cos(angle) * distance,
    targetCoordinates[1] + Math.sin(angle) * distance,
  ];
}

function slugifyReferenceLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function getSourcePath(sourceId: string) {
  return `/sources/${sourceId}`;
}

function readRoute(): PageRoute {
  const sourceMatch = /^\/sources\/([^/]+)\/?$/.exec(window.location.pathname);

  if (sourceMatch?.[1]) {
    return {
      sourceId: decodeURIComponent(sourceMatch[1]),
      view: "source",
    };
  }

  return { view: "atlas" };
}
