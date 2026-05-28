import type { Meta, StoryObj } from "@storybook/react-vite";

import { historicalSources } from "../../entities/source/api/staticSourceData";
import { RelatedSources } from "./RelatedSources";

const meta = {
  component: RelatedSources,
  title: "Features/Source Detail/RelatedSources",
} satisfies Meta<typeof RelatedSources>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithRelatedSources: Story = {
  args: {
    onOpenSource: () => {},
    source: historicalSources[0]!,
    sources: historicalSources,
  },
};

export const NoRelatedSources: Story = {
  args: {
    onOpenSource: () => {},
    source: historicalSources[0]!,
    sources: [historicalSources[0]!],
  },
};
