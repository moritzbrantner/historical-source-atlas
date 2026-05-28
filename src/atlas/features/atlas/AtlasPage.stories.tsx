import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { SourceRepository } from '../../entities/source/api/sourceRepository';
import { staticSourceRepository } from '../../entities/source/api/staticSourceRepository';
import { AtlasPage } from './AtlasPage';

const emptySourceRepository: SourceRepository = {
  async getSourceBySlug() {
    return null;
  },
  async listAtlasSources() {
    return [];
  },
};

const meta = {
  args: {
    onOpenSource: () => undefined,
    sourceRepository: staticSourceRepository,
  },
  component: AtlasPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['test'],
  title: 'Atlas/AtlasPage',
} satisfies Meta<typeof AtlasPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', {
        name: /map the places where texts and artifacts entered the record/i,
      }),
    ).toBeVisible();
    await expect(
      (await canvas.findAllByText('Dead Sea Scrolls'))[0],
    ).toBeVisible();
  },
};

export const Empty: Story = {
  args: {
    sourceRepository: emptySourceRepository,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByText(
        (_, element) =>
          element?.textContent?.replace(/\s+/g, ' ').trim() ===
          '0 visible sources',
      ),
    ).toBeVisible();
  },
};
