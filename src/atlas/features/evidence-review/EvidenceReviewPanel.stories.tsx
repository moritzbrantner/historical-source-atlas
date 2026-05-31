import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { EvidenceRepository } from '../../entities/evidence/api/evidenceRepository';
import { staticEvidenceReviews } from '../../entities/evidence/api/staticEvidenceData';
import { staticEvidenceRepository } from '../../entities/evidence/api/staticEvidenceRepository';
import { historicalSources } from '../../entities/source/api/staticSourceData';
import { EvidenceReviewPanel } from './EvidenceReviewPanel';

const source = historicalSources.find(
  (candidate) => candidate.id === 'dead-sea-scrolls',
)!;
const codexSinaiticus = historicalSources.find(
  (candidate) => candidate.id === 'codex-sinaiticus',
)!;

const emptyEvidenceRepository: EvidenceRepository = {
  async getEvidenceBySourceSlug(slug) {
    return {
      ...staticEvidenceReviews[0]!,
      sourceSlug: slug,
      title: 'Empty evidence review',
      units: [],
    };
  },
};

const overlappingEvidenceRepository: EvidenceRepository = {
  async getEvidenceBySourceSlug(slug) {
    return {
      ...staticEvidenceReviews[0]!,
      sourceSlug: slug,
      title: 'Overlapping evidence review',
      units: [
        {
          content: 'The community in the wilderness sought the law.',
          id: 'overlap-unit',
          label: 'Overlap example',
          note: null,
          overlays: [
            {
              certainty: 'illustrative',
              content: 'Important communal phrase.',
              endOffset: 33,
              id: 'overlap-important',
              kind: 'highlight',
              label: 'Important span',
              layerId: 'important',
              startOffset: 4,
              unitId: 'overlap-unit',
            },
            {
              certainty: 'illustrative',
              content: 'Interpretive rendering: wilderness group.',
              endOffset: 27,
              id: 'overlap-translation',
              kind: 'translation',
              label: 'Translation span',
              layerId: 'translation',
              startOffset: 18,
              unitId: 'overlap-unit',
            },
          ],
          sequence: 1,
          unitType: 'line',
        },
      ],
    };
  },
};

const meta = {
  args: {
    evidenceRepository: staticEvidenceRepository,
    source,
  },
  component: EvidenceReviewPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['test'],
  title: 'Atlas/EvidenceReviewPanel',
} satisfies Meta<typeof EvidenceReviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Fixture: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByRole('heading', { name: 'Evidence Review' }),
    ).toBeVisible();
    await expect(await canvas.findByText('1QS I, excerpt')).toBeVisible();
  },
};

export const Empty: Story = {
  args: {
    evidenceRepository: emptyEvidenceRepository,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('No evidence text')).toBeVisible();
  },
};

export const ManuscriptImageEvidence: Story = {
  args: {
    evidenceRepository: staticEvidenceRepository,
    source: codexSinaiticus,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByText('Add MS 43725, f. 1r excerpt'),
    ).toBeVisible();
  },
};

export const Overlapping: Story = {
  args: {
    evidenceRepository: overlappingEvidenceRepository,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Overlap example')).toBeVisible();
  },
};

export const Narrow: Story = {
  args: {
    evidenceRepository: staticEvidenceRepository,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
