import type { Meta, StoryObj } from "@storybook/react-vite";

import { historicalSources } from "../../entities/source/api/staticSourceData";
import { SourceReferenceNetwork } from "./SourceReferenceNetwork";

const meta = {
  component: SourceReferenceNetwork,
  title: "Features/Source Detail/SourceReferenceNetwork",
} satisfies Meta<typeof SourceReferenceNetwork>;

export default meta;

type Story = StoryObj<typeof meta>;

const sourceWithoutReferences = {
  ...historicalSources[0]!,
  properties: {
    ...historicalSources[0]!.properties,
    referencedIn: [],
    references: [],
  },
};

export const WithIncomingAndOutgoing: Story = {
  args: {
    source: historicalSources[0]!,
  },
};

export const NoReferences: Story = {
  args: {
    source: sourceWithoutReferences,
  },
};
