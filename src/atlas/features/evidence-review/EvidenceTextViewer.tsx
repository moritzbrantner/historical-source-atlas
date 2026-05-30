import type {
  EvidenceLayerId,
  EvidenceOverlay,
  EvidenceTextUnit,
} from '../../entities/evidence/model/evidenceTypes';
import {
  buildEvidenceTextSegments,
  type EvidenceTextSegment,
} from './offsetSegments';

export function EvidenceTextViewer({
  activeLayerIds,
  onSelectSegment,
  selectedSegmentId,
  units,
}: {
  activeLayerIds: Set<EvidenceLayerId>;
  onSelectSegment: (segment: EvidenceTextSegment) => void;
  selectedSegmentId: string | null;
  units: EvidenceTextUnit[];
}) {
  return (
    <div className="grid gap-5" data-testid="evidence-text-viewer">
      {units.map((unit) => (
        <section
          aria-label={unit.label ?? `Evidence unit ${unit.sequence}`}
          className="grid gap-2"
          key={unit.id}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <span>{unit.label ?? `Unit ${unit.sequence}`}</span>
            <span>{unit.unitType}</span>
          </div>
          <p className="m-0 max-w-3xl text-base leading-8 text-slate-800">
            {buildEvidenceTextSegments({
              activeLayerIds,
              content: unit.content,
              overlays: unit.overlays,
            }).map((segment) => (
              <EvidenceSegment
                key={segment.id}
                onSelectSegment={onSelectSegment}
                segment={segment}
                selected={
                  selectedSegmentId === segment.id &&
                  segment.overlays.length > 0
                }
              />
            ))}
          </p>
          {unit.note ? (
            <p className="m-0 max-w-3xl text-sm leading-6 text-slate-500">
              {unit.note}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function EvidenceSegment({
  onSelectSegment,
  segment,
  selected,
}: {
  onSelectSegment: (segment: EvidenceTextSegment) => void;
  segment: EvidenceTextSegment;
  selected: boolean;
}) {
  const primaryOverlay = segment.primaryOverlay;

  if (!primaryOverlay) {
    return <span>{segment.text}</span>;
  }

  const hasDetails = segment.overlays.some(hasOverlayDetails);
  const className = evidenceSegmentClassName(primaryOverlay, selected);

  if (!hasDetails) {
    return <mark className={className}>{segment.text}</mark>;
  }

  return (
    <button
      aria-label={`${primaryOverlay.label}: ${segment.text}`}
      className={`${className} cursor-pointer border-0 text-left font-inherit`}
      onClick={() => {
        onSelectSegment(segment);
      }}
      type="button"
    >
      {segment.text}
    </button>
  );
}

function hasOverlayDetails(overlay: EvidenceOverlay) {
  return Boolean(
    overlay.content ||
    overlay.certainty ||
    overlay.targetEntityLabel ||
    overlay.targetEntityType,
  );
}

function evidenceSegmentClassName(overlay: EvidenceOverlay, selected: boolean) {
  const base =
    'rounded px-0.5 py-0 align-baseline text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900';
  const selectedClass = selected ? ' ring-2 ring-slate-900/30' : '';
  const layerClass = {
    entities:
      'bg-sky-100 underline decoration-sky-500 decoration-2 underline-offset-4',
    important: 'bg-amber-100',
    notes:
      'bg-slate-100 underline decoration-slate-400 decoration-dotted underline-offset-4',
    translation:
      'bg-teal-100 underline decoration-teal-600 decoration-2 underline-offset-4',
  }[overlay.layerId];

  return `${base} ${layerClass}${selectedClass}`;
}
