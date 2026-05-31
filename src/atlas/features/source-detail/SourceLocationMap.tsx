'use client';

import dynamic from 'next/dynamic';

import type { HistoricalSource } from '../../entities/source/model/sourceTypes';

const DynamicSourceLocationMapClient = dynamic(
  () =>
    import('./SourceLocationMapClient').then(
      (module) => module.SourceLocationMapClient,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="source-page-map min-h-[330px] overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-xl shadow-slate-900/10" />
    ),
  },
);

export function SourceLocationMap({ source }: { source: HistoricalSource }) {
  return <DynamicSourceLocationMapClient source={source} />;
}
