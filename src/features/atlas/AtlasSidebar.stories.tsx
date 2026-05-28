import type { Meta } from "@storybook/react-vite";
import { useState } from "react";

import { historicalSources } from "../../entities/source/api/staticSourceData";
import type { HistoricalSource } from "../../entities/source/model/sourceTypes";
import { AtlasSidebar } from "./AtlasSidebar";

const meta = {
  component: AtlasSidebar,
  title: "Features/Atlas/AtlasSidebar",
} satisfies Meta<typeof AtlasSidebar>;

export default meta;

const sources = historicalSources.slice(0, 5);

function SidebarStory({ storySources }: { storySources: HistoricalSource[] }) {
  const [selectedSourceId, setSelectedSourceId] = useState(storySources[0]?.id);
  const selectedSource = storySources.find((source) => source.id === selectedSourceId);

  return (
    <div className="max-w-md">
      <AtlasSidebar
        selectedSource={selectedSource}
        selectedSourceId={selectedSourceId}
        sourceStats={{
          manuscripts: storySources.filter((source) => source.properties.kind === "manuscript")
            .length,
          regions: new Set(storySources.map((source) => source.properties.region)).size,
          total: storySources.length,
        }}
        sources={storySources}
        timelineMode="discovery"
        onOpenSource={() => {}}
        onSelectSource={setSelectedSourceId}
      />
    </div>
  );
}

export const SelectedSource = {
  render: () => <SidebarStory storySources={sources} />,
};

export const NoVisibleSources = {
  render: () => <SidebarStory storySources={[]} />,
};

export const LongSourceNames = {
  render: () => (
    <SidebarStory
      storySources={[
        {
          ...sources[0]!,
          id: "long-source-name",
          label:
            "Exceptionally Long Catalogue Title For A Fragmentary Historical Source With Regional Context",
        },
        ...sources.slice(1),
      ]}
    />
  ),
};
