import type { Meta, StoryObj } from "@storybook/react-vite";

import { App } from "./App";

const meta = {
  component: App,
  title: "App/App",
} satisfies Meta<typeof App>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AtlasRoute: Story = {
  render: () => {
    window.history.pushState({}, "", "/");
    return <App />;
  },
};

export const SourceRoute: Story = {
  render: () => {
    window.history.pushState({}, "", "/sources/dead-sea-scrolls");
    return <App />;
  },
};

export const UnknownSourceRoute: Story = {
  render: () => {
    window.history.pushState({}, "", "/sources/not-a-real-source");
    return <App />;
  },
};
