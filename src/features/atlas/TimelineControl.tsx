import { Badge, Button, Slider, Surface } from "@moritzbrantner/ui";

import { formatTimelineYear } from "../../entities/source/lib/sourceFormatting";
import type { TimelineMode, TimelineModeConfig } from "./model/atlasTypes";

export function TimelineControl({
  maxYear,
  minYear,
  mode,
  modeConfig,
  onModeChange,
  onTimelineYearChange,
  sourceCount,
  timelineYear,
}: {
  maxYear: number;
  minYear: number;
  mode: TimelineMode;
  modeConfig: TimelineModeConfig;
  onModeChange: (mode: TimelineMode) => void;
  onTimelineYearChange: (year: number) => void;
  sourceCount: number;
  timelineYear: number;
}) {
  return (
    <Surface
      aria-label="Timeline controls"
      className="grid gap-4 md:grid-cols-[minmax(260px,1fr)_minmax(150px,190px)_minmax(260px,520px)_auto] md:items-center"
    >
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <span className="text-xs font-bold uppercase text-slate-500">
            {modeConfig.label} timeline
          </span>
          <strong className="truncate text-lg font-bold text-slate-950">
            {modeConfig.title} {formatTimelineYear(timelineYear, mode)}
          </strong>
        </div>
        <Badge>{sourceCount} visible</Badge>
      </div>

      <label className="grid gap-1 text-xs font-semibold text-slate-600">
        <span>Use</span>
        <select
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
          value={mode}
          onChange={(event) => {
            onModeChange(event.target.value as TimelineMode);
          }}
        >
          <option value="discovery">Discovery time</option>
          <option value="source">Source date</option>
        </select>
      </label>

      <div className="grid grid-cols-[auto_minmax(140px,1fr)_auto] items-center gap-3 text-xs font-bold tabular-nums text-slate-500">
        <span>{formatTimelineYear(minYear, mode)}</span>
        <Slider
          max={maxYear}
          min={minYear}
          step={1}
          thumbAriaLabel={`${modeConfig.label} year`}
          value={[timelineYear]}
          onValueChange={(value) => {
            onTimelineYearChange(value[0] ?? timelineYear);
          }}
        />
        <span>{formatTimelineYear(maxYear, mode)}</span>
      </div>

      <div className="flex flex-col justify-end gap-2 sm:flex-row">
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
    </Surface>
  );
}
