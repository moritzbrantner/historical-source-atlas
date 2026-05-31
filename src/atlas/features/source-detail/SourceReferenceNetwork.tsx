import {
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';
import Link from 'next/link';

import { getEntityPath } from '../../app/entityRouting';
import type { EntityType } from '../../domain/dataModel';
import { sourceKindColors } from '../../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';

export function SourceReferenceNetwork({
  source,
}: {
  source: HistoricalSource;
}) {
  return (
    <Surface>
      <SurfaceHeader>
        <SurfaceTitle>Reference Network</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(190px,240px)_minmax(0,1fr)]">
          <ReferenceColumn
            items={source.properties.referencedIn}
            title="Referenced by"
            tone="incoming"
          />
          <div className="grid min-h-56 place-items-center content-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full shadow-[0_0_0_7px_rgb(15_118_110_/_0.12)]"
              style={{ background: sourceKindColors[source.properties.kind] }}
            />
            <strong className="text-base text-slate-950">{source.label}</strong>
            <p className="text-sm text-slate-600">{source.properties.period}</p>
          </div>
          <ReferenceColumn
            items={source.properties.references}
            title="References"
            tone="outgoing"
          />
        </div>
      </SurfaceContent>
    </Surface>
  );
}

function ReferenceColumn({
  items,
  title,
  tone,
}: {
  items: HistoricalSource['properties']['references'];
  title: string;
  tone: 'incoming' | 'outgoing';
}) {
  const toneClassName =
    tone === 'incoming'
      ? 'bg-blue-50 text-blue-700'
      : 'bg-teal-50 text-teal-700';

  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-xs font-bold uppercase text-slate-500">{title}</h3>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li
            className="grid gap-1 rounded-md border border-slate-200 bg-white p-3"
            key={`${title}-${item.relation}-${item.label}`}
          >
            <span
              className={`w-fit rounded-full px-2 py-1 text-xs font-bold ${toneClassName}`}
            >
              {item.relation}
            </span>
            {item.targetEntitySlug && item.targetEntityType ? (
              <Link
                className="text-sm font-bold text-slate-900 no-underline hover:text-teal-700"
                href={getEntityPath({
                  agentKind: item.targetEntityAgentKind,
                  slug: item.targetEntitySlug,
                  type: item.targetEntityType as EntityType,
                })}
              >
                {item.label}
              </Link>
            ) : (
              <strong className="text-sm text-slate-900">{item.label}</strong>
            )}
            <p className="text-sm leading-5 text-slate-600">{item.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
