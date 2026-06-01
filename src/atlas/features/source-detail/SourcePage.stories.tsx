import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { SourceRepository } from '../../entities/source/api/sourceRepository';
import { staticSourceRepository } from '../../entities/source/api/staticSourceRepository';
import { SourcePage } from './SourcePage';

const notFoundSourceRepository: SourceRepository = {
  async getSourceBySlug() {
    return null;
  },
  listAtlasSources: staticSourceRepository.listAtlasSources,
};

const meta = {
  args: {
    onBackToAtlas: () => undefined,
    onOpenComparison: () => undefined,
    onOpenReferenceNetwork: () => undefined,
    onOpenSource: () => undefined,
    sourceId: 'dead-sea-scrolls',
    sourceRepository: staticSourceRepository,
  },
  component: SourcePage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['test'],
  title: 'Atlas/SourcePage',
} satisfies Meta<typeof SourcePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeadSeaScrolls: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: 'Dead Sea Scrolls' }),
    ).toBeVisible();
    await expect(
      await canvas.findByText('Qumran Caves, near the Dead Sea'),
    ).toBeVisible();
  },
};

export const NotFound: Story = {
  args: {
    sourceId: 'unknown-source',
    sourceRepository: notFoundSourceRepository,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Source not found')).toBeVisible();
  },
};
