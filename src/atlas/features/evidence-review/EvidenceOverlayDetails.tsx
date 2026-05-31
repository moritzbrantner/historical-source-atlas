import { Badge } from '@moritzbrantner/ui';
import Link from 'next/link';

import { getEntityPath } from '../../app/entityRouting';
import type { EntityType } from '../../domain/dataModel';
import type { EvidenceOverlay } from '../../entities/evidence/model/evidenceTypes';

export function EvidenceOverlayDetails({
  overlays,
}: {
  overlays: EvidenceOverlay[];
}) {
  if (overlays.length === 0) {
    return (
      <aside
        aria-label="Selected evidence overlay details"
        className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        Select a highlighted passage to review its evidence layer details.
      </aside>
    );
  }

  return (
    <aside
      aria-label="Selected evidence overlay details"
      className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      {overlays.map((overlay) => (
        <section className="grid gap-2" key={overlay.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{overlay.kind}</Badge>
            <h4 className="m-0 text-sm font-semibold text-slate-900">
              {overlay.label}
            </h4>
          </div>
          {overlay.content ? (
            <p className="m-0 text-sm leading-6 text-slate-700">
              {overlay.content}
            </p>
          ) : null}
          {overlay.targetEntityLabel ? (
            <p className="m-0 text-xs font-semibold uppercase text-slate-500">
              {overlay.targetEntityType ?? 'entity'}:{' '}
              {overlay.targetEntitySlug && overlay.targetEntityType ? (
                <Link
                  className="text-slate-700 no-underline hover:text-teal-700"
                  href={getEntityPath({
                    agentKind:
                      overlay.targetEntityType === 'agent'
                        ? 'person'
                        : undefined,
                    slug: overlay.targetEntitySlug,
                    type: overlay.targetEntityType as EntityType,
                  })}
                >
                  {overlay.targetEntityLabel}
                </Link>
              ) : (
                overlay.targetEntityLabel
              )}
            </p>
          ) : null}
          {overlay.certainty ? (
            <p className="m-0 text-xs text-slate-500">
              Certainty: {overlay.certainty}
            </p>
          ) : null}
        </section>
      ))}
    </aside>
  );
}
