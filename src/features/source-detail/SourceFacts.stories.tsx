import type { Meta, StoryObj } from "@storybook/react-vite";

import { historicalSources } from "../../entities/source/api/staticSourceData";
import { SourceFacts } from "./SourceFacts";

const meta = {
  component: SourceFacts,
  title: "Features/Source Detail/SourceFacts",
} satisfies Meta<typeof SourceFacts>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    source: historicalSources[0]!,
  },
};
