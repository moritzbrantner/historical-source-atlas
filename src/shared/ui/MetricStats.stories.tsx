import type { Meta, StoryObj } from "@storybook/react-vite";

import { MetricStats } from "./MetricStats";

const meta = {
  component: MetricStats,
  title: "Shared UI/MetricStats",
} satisfies Meta<typeof MetricStats>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    stats: [
      { label: "visible sources", value: 12 },
      { label: "regions", value: 8 },
      { label: "manuscripts", value: 4 },
    ],
  },
};

export const MixedValues: Story = {
  args: {
    stats: [
      { label: "atlas weight", value: 9 },
      { label: "date range", value: "250 BC-1952" },
      { label: "references", value: 3 },
    ],
  },
};
