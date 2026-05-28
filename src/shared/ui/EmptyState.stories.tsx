import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@moritzbrantner/ui";

import { EmptyState } from "./EmptyState";

const meta = {
  component: EmptyState,
  title: "Shared UI/EmptyState",
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    description: "Move the timeline forward or adjust the filters.",
    title: "No sources visible",
  },
};

export const WithActions: Story = {
  args: {
    actions: <Button type="button">Reset filters</Button>,
    description: "Select another source from the atlas to continue exploring.",
    title: "Source not found",
  },
};
