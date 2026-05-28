import type { Meta } from "@storybook/react-vite";
import { useState } from "react";

import type { SourceKindFilters } from "../../entities/source/lib/sourceFiltering";
import type { SourceReferenceDirection } from "../../entities/source/lib/sourceReferences";
import { createDefaultSourceKindFilters } from "./model/useAtlasViewModel";
import { AtlasFilters } from "./AtlasFilters";

const meta = {
  component: AtlasFilters,
  title: "Features/Atlas/AtlasFilters",
} satisfies Meta<typeof AtlasFilters>;

export default meta;

function FiltersStory({
  initialReferenceDirections = ["incoming", "outgoing"],
  initialSourceKindFilters = createDefaultSourceKindFilters(),
}: {
  initialReferenceDirections?: SourceReferenceDirection[];
  initialSourceKindFilters?: SourceKindFilters;
}) {
  const [query, setQuery] = useState("");
  const [sourceKindFilters, setSourceKindFilters] = useState(initialSourceKindFilters);
  const [referenceDirectionFilters, setReferenceDirectionFilters] = useState(
    initialReferenceDirections,
  );

  return (
    <AtlasFilters
      query={query}
      referenceDirectionFilters={referenceDirectionFilters}
      resultCount={7}
      sourceKindFilters={sourceKindFilters}
      onQueryChange={setQuery}
      onReferenceDirectionFiltersChange={setReferenceDirectionFilters}
      onSourceKindFiltersChange={setSourceKindFilters}
    />
  );
}

const customizedSourceKindFilters = createDefaultSourceKindFilters();
customizedSourceKindFilters.manuscript = {
  all: false,
  referenced: {
    depth: 2,
    enabled: true,
  },
  referencing: {
    depth: 1,
    enabled: false,
  },
};

export const DefaultFilters = {
  render: () => <FiltersStory />,
};

export const CustomizedSourceKind = {
  render: () => <FiltersStory initialSourceKindFilters={customizedSourceKindFilters} />,
};

export const NoMapLinks = {
  render: () => <FiltersStory initialReferenceDirections={[]} />,
};
