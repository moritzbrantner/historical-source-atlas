import { Button, Surface, SurfaceContent, SurfaceHeader, SurfaceTitle } from "@moritzbrantner/ui";

import { formatTimelineYear } from "../../entities/source/lib/sourceFormatting";
import type { HistoricalSource } from "../../entities/source/model/sourceTypes";

export function RelatedSources({
  onOpenSource,
  source,
  sources,
}: {
  onOpenSource: (sourceId: string) => void;
  source: HistoricalSource;
  sources: HistoricalSource[];
}) {
  const relatedRegionalSources = sources
    .filter(
      (candidate) =>
        candidate.id !== source.id && candidate.properties.region === source.properties.region,
    )
    .slice(0, 3);

  return (
    <Surface>
      <SurfaceHeader>
        <SurfaceTitle>Atlas Context</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent className="grid gap-4">
        <dl className="grid gap-3">
          <ContextFact label="Region" value={source.properties.region} />
          <ContextFact label="Discovery year" value={`${source.properties.discoveredYear}`} />
          <ContextFact
            label="Source year"
            value={formatTimelineYear(source.properties.sourceYear, "source")}
          />
        </dl>
        {relatedRegionalSources.length > 0 ? (
          <div className="grid gap-2">
            {relatedRegionalSources.map((relatedSource) => (
              <Button
                className="justify-between"
                key={relatedSource.id}
                type="button"
                variant="secondary"
                onClick={() => {
                  onOpenSource(relatedSource.id);
                }}
              >
                <span className="truncate">{relatedSource.label}</span>
                <small className="truncate text-xs opacity-75">
                  {relatedSource.properties.period}
                </small>
              </Button>
            ))}
          </div>
        ) : null}
      </SurfaceContent>
    </Surface>
  );
}

function ContextFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="m-0 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
