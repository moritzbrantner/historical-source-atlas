import type { HistoricalSourceFeature } from '../../entities/source/lib/sourceReferences';
import { getFeatureProperties } from '../../entities/source/lib/sourceReferences';

export function SourcePopup({
  feature,
  tags,
}: {
  feature: HistoricalSourceFeature;
  tags?: readonly string[];
}) {
  const properties = getFeatureProperties(feature);

  return (
    <div className="grid min-w-52 gap-1">
      <strong className="text-sm text-slate-950">{feature.point.label}</strong>
      <span className="text-sm text-slate-600">{properties.location}</span>
      <span className="text-sm text-slate-600">
        Found: {properties.discovered}
      </span>
      {tags?.length ? (
        <span className="flex flex-wrap gap-1 pt-1">
          {tags.map((tag) => (
            <span
              className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
