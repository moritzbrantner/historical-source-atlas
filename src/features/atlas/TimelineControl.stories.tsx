import type { Meta } from "@storybook/react-vite";
import { useState } from "react";

import type { YearRange } from "../../entities/source/lib/sourceFiltering";
import type { TimelineMode } from "./model/atlasTypes";
import { TimelineControl } from "./TimelineControl";

const meta = {
  component: TimelineControl,
  title: "Features/Atlas/TimelineControl",
} satisfies Meta<typeof TimelineControl>;

export default meta;

function TimelineStory({
  initialMode,
  initialRange,
}: {
  initialMode: TimelineMode;
  initialRange: YearRange;
}) {
  const [mode, setMode] = useState(initialMode);
  const [timelineRange, setTimelineRange] = useState(initialRange);
  const modeConfig =
    mode === "discovery"
      ? {
          label: "Discovery time",
          maxYear: 1952,
          minYear: 1799,
          title: "Sources known by",
        }
      : {
          label: "Source date",
          maxYear: 1200,
          minYear: -2500,
          title: "Sources dated by",
        };

  return (
    <TimelineControl
      maxYear={modeConfig.maxYear}
      minYear={modeConfig.minYear}
      mode={mode}
      modeConfig={modeConfig}
      sourceCount={8}
      timelineRange={timelineRange}
      onModeChange={(nextMode) => {
        setMode(nextMode);
        setTimelineRange(
          nextMode === "discovery" ? { max: 1952, min: 1799 } : { max: 1200, min: -2500 },
        );
      }}
      onTimelineRangeChange={setTimelineRange}
    />
  );
}

export const DiscoveryTimeline = {
  render: () => <TimelineStory initialMode="discovery" initialRange={{ max: 1952, min: 1799 }} />,
};

export const SourceDateTimeline = {
  render: () => <TimelineStory initialMode="source" initialRange={{ max: 1200, min: -2500 }} />,
};

export const NarrowRange = {
  render: () => <TimelineStory initialMode="source" initialRange={{ max: -100, min: -350 }} />,
};
