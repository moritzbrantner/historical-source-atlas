import type { Meta, StoryObj } from "@storybook/react-vite";

import { SourcePage } from "./SourcePage";

const meta = {
  component: SourcePage,
  title: "Features/Source Detail/SourcePage",
} satisfies Meta<typeof SourcePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeadSeaScrolls: Story = {
  args: {
    onBackToAtlas: () => {},
    onOpenSource: () => {},
    sourceId: "dead-sea-scrolls",
  },
};

export const RosettaStone: Story = {
  args: {
    onBackToAtlas: () => {},
    onOpenSource: () => {},
    sourceId: "rosetta-stone",
  },
};

export const UnknownSource: Story = {
  args: {
    onBackToAtlas: () => {},
    onOpenSource: () => {},
    sourceId: "not-a-real-source",
  },
};
