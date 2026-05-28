import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";

import { AtlasPage } from "./AtlasPage";

const meta = {
  component: AtlasPage,
  title: "Features/Atlas/AtlasPage",
} satisfies Meta<typeof AtlasPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onOpenSource: () => {},
  },
};

export const FilteredBySearch: Story = {
  args: {
    onOpenSource: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByPlaceholderText("Qumran, papyri, Iran..."), "Qumran");
  },
};

export const NoVisibleSources: Story = {
  args: {
    onOpenSource: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByPlaceholderText("Qumran, papyri, Iran..."), "zzzzzzzz");
  },
};
