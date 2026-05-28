'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';

import { sourceKindLabels } from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';

type ComparisonRow = {
  currentValue: string;
  key: string;
  label: string;
  matches?: boolean;
  targetValue: string;
};

export function SourceComparison({
  onOpenSource,
  source,
  sources,
}: {
  onOpenSource?: (sourceId: string) => void;
  source: HistoricalSource;
  sources: HistoricalSource[];
}) {
  const comparisonSources = useMemo(
    () => rankComparisonSources(source, sources),
    [source, sources],
  );
  const [selectedSourceId, setSelectedSourceId] = useState(
    comparisonSources[0]?.id ?? '',
  );

  useEffect(() => {
    if (
      comparisonSources.length > 0 &&
      !comparisonSources.some((candidate) => candidate.id === selectedSourceId)
    ) {
      setSelectedSourceId(comparisonSources[0]!.id);
    }
  }, [comparisonSources, selectedSourceId]);

  const comparisonSource =
    comparisonSources.find((candidate) => candidate.id === selectedSourceId) ??
    comparisonSources[0];

  if (!comparisonSource) {
    return null;
  }

  const rows = getComparisonRows(source, comparisonSource);
  const sourceYearGap = Math.abs(
    source.properties.sourceYear - comparisonSource.properties.sourceYear,
  );
  const discoveryYearGap = Math.abs(
    source.properties.discoveredYear -
      comparisonSource.properties.discoveredYear,
  );

  return (
    <Surface aria-label="Source comparison">
      <SurfaceHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SurfaceTitle>Compare Sources</SurfaceTitle>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:min-w-64">
            <span>Compare with</span>
            <select
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
              value={comparisonSource.id}
              onChange={(event) => {
                setSelectedSourceId(event.target.value);
              }}
            >
              {comparisonSources.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SurfaceHeader>
      <SurfaceContent className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
          <ComparisonSourceSummary label="Current source" source={source} />
          <ComparisonSourceSummary
            label="Compared source"
            source={comparisonSource}
          />
        </div>

        <dl
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Comparison signals"
        >
          <Signal
            label="Kind"
            value={
              source.properties.kind === comparisonSource.properties.kind
                ? 'Same kind'
                : 'Different kinds'
            }
          />
          <Signal
            label="Region"
            value={
              source.properties.region === comparisonSource.properties.region
                ? 'Same region'
                : 'Different regions'
            }
          />
          <Signal label="Source gap" value={formatYearGap(sourceYearGap)} />
          <Signal
            label="Discovery gap"
            value={formatYearGap(discoveryYearGap)}
          />
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-500">
                  Field
                </th>
                <th className="border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-500">
                  {source.label}
                </th>
                <th className="border-b border-slate-200 px-3 py-2 text-xs font-bold uppercase text-slate-500">
                  {comparisonSource.label}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th className="border-b border-slate-100 px-3 py-3 align-top font-semibold text-slate-600">
                    {row.label}
                  </th>
                  <td className="border-b border-slate-100 px-3 py-3 align-top text-slate-900">
                    <ComparedValue matches={row.matches}>
                      {row.currentValue}
                    </ComparedValue>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 align-top text-slate-900">
                    <ComparedValue matches={row.matches}>
                      {row.targetValue}
                    </ComparedValue>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {onOpenSource ? (
          <Button
            className="justify-self-start"
            type="button"
            variant="secondary"
            onClick={() => {
              onOpenSource(comparisonSource.id);
            }}
          >
            Open compared source
          </Button>
        ) : null}
      </SurfaceContent>
    </Surface>
  );
}

function ComparisonSourceSummary({
  label,
  source,
}: {
  label: string;
  source: HistoricalSource;
}) {
  return (
    <section className="grid gap-2 rounded-md bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase text-slate-500">
          {label}
        </span>
        <Badge>{sourceKindLabels[source.properties.kind]}</Badge>
      </div>
      <h3 className="text-base font-bold leading-6 text-slate-950">
        {source.label}
      </h3>
      <p className="line-clamp-3 text-sm leading-6 text-slate-600">
        {source.properties.summary}
      </p>
    </section>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-200 bg-white p-3">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="m-0 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function ComparedValue({
  children,
  matches,
}: {
  children: string;
  matches?: boolean;
}) {
  return (
    <span
      className={
        matches
          ? 'rounded-full bg-teal-50 px-2 py-1 font-semibold text-teal-800'
          : undefined
      }
    >
      {children}
    </span>
  );
}

function getComparisonRows(
  source: HistoricalSource,
  comparisonSource: HistoricalSource,
): ComparisonRow[] {
  return [
    {
      currentValue: sourceKindLabels[source.properties.kind],
      key: 'kind',
      label: 'Kind',
      matches: source.properties.kind === comparisonSource.properties.kind,
      targetValue: sourceKindLabels[comparisonSource.properties.kind],
    },
    {
      currentValue: source.properties.region,
      key: 'region',
      label: 'Region',
      matches: source.properties.region === comparisonSource.properties.region,
      targetValue: comparisonSource.properties.region,
    },
    {
      currentValue: source.properties.location,
      key: 'location',
      label: 'Discovery place',
      targetValue: comparisonSource.properties.location,
    },
    {
      currentValue: source.properties.discovered,
      key: 'discovered',
      label: 'Discovery date',
      targetValue: comparisonSource.properties.discovered,
    },
    {
      currentValue: source.properties.period,
      key: 'period',
      label: 'Source date',
      targetValue: comparisonSource.properties.period,
    },
    {
      currentValue: source.properties.currentRepository,
      key: 'repository',
      label: 'Repository',
      targetValue: comparisonSource.properties.currentRepository,
    },
    {
      currentValue: `${source.metrics.importance}`,
      key: 'importance',
      label: 'Atlas weight',
      targetValue: `${comparisonSource.metrics.importance}`,
    },
    {
      currentValue: `${source.properties.referencedIn.length}`,
      key: 'referenced-in',
      label: 'Referenced by',
      targetValue: `${comparisonSource.properties.referencedIn.length}`,
    },
    {
      currentValue: `${source.properties.references.length}`,
      key: 'references',
      label: 'References',
      targetValue: `${comparisonSource.properties.references.length}`,
    },
  ];
}

function rankComparisonSources(
  source: HistoricalSource,
  sources: HistoricalSource[],
) {
  return sources
    .filter((candidate) => candidate.id !== source.id)
    .sort((left, right) => {
      const leftScore = getComparisonScore(source, left);
      const rightScore = getComparisonScore(source, right);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return left.label.localeCompare(right.label);
    });
}

function getComparisonScore(
  source: HistoricalSource,
  candidate: HistoricalSource,
) {
  const sameRegion = source.properties.region === candidate.properties.region;
  const sameKind = source.properties.kind === candidate.properties.kind;
  const sourceYearDistance = Math.abs(
    source.properties.sourceYear - candidate.properties.sourceYear,
  );
  const discoveryYearDistance = Math.abs(
    source.properties.discoveredYear - candidate.properties.discoveredYear,
  );

  return (
    (sameRegion ? 10_000 : 0) +
    (sameKind ? 2_000 : 0) -
    sourceYearDistance -
    discoveryYearDistance / 10
  );
}

function formatYearGap(years: number) {
  if (years === 0) {
    return 'Same year';
  }

  return `${years.toLocaleString()} years`;
}
