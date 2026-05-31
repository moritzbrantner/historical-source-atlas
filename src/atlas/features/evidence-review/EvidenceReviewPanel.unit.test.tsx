// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import type { EvidenceRepository } from '../../entities/evidence/api/evidenceRepository';
import { staticEvidenceReviews } from '../../entities/evidence/api/staticEvidenceData';
import { staticEvidenceRepository } from '../../entities/evidence/api/staticEvidenceRepository';
import { historicalSources } from '../../entities/source/api/staticSourceData';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';
import { EvidenceReviewPanel } from './EvidenceReviewPanel';

const deadSeaScrolls = historicalSources.find(
  (source) => source.id === 'dead-sea-scrolls',
)!;
const codexSinaiticus = historicalSources.find(
  (source) => source.id === 'codex-sinaiticus',
)!;

afterEach(() => {
  cleanup();
});

describe('EvidenceReviewPanel', () => {
  it('renders fixture evidence', async () => {
    renderEvidencePanel(deadSeaScrolls, staticEvidenceRepository);

    expect(
      await screen.findByRole('heading', { name: 'Evidence Review' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('1QS I, excerpt')).toBeInTheDocument();
    expect(screen.getByText(/Teacher of Righteousness/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /community in the wilderness/ }),
    ).toBeInTheDocument();
  });

  it('toggles layers on and off', async () => {
    const user = userEvent.setup();
    renderEvidencePanel(deadSeaScrolls, staticEvidenceRepository);

    await screen.findByRole('button', { name: /seek the law/ });
    await user.click(screen.getByRole('button', { name: 'Translations' }));

    expect(
      screen.queryByRole('button', { name: /seek the law/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Translations' }));

    expect(
      screen.getByRole('button', { name: /seek the law/ }),
    ).toBeInTheDocument();
  });

  it('selects an overlay and shows details', async () => {
    const user = userEvent.setup();
    renderEvidencePanel(deadSeaScrolls, staticEvidenceRepository);

    await user.click(
      await screen.findByRole('button', { name: /seek the law/ }),
    );

    expect(
      screen.getByText('Interpretive rendering: study and obey the law.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Certainty: illustrative fixture'),
    ).toBeInTheDocument();
  });

  it('renders manuscript image evidence when image assets exist', async () => {
    renderEvidencePanel(codexSinaiticus, staticEvidenceRepository);

    expect(
      await screen.findByTestId('manuscript-image-viewer'),
    ).toBeInTheDocument();
    expect(screen.getByText('Add MS 43725, f. 1r excerpt')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /First column line group image region on f\. 1r/,
      }),
    ).toBeInTheDocument();
  });

  it('selecting text highlights its manuscript image region', async () => {
    const user = userEvent.setup();
    renderEvidencePanel(codexSinaiticus, staticEvidenceRepository);

    await user.click(
      await screen.findByRole('button', { name: /φυλάσσειν: ΦΥΛΑΣΣΕΙΝ/ }),
    );

    expect(
      screen.getByRole('button', {
        name: /φυλάσσειν image region on f\. 1r/,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking an image region updates overlay details', async () => {
    const user = userEvent.setup();
    renderEvidencePanel(codexSinaiticus, staticEvidenceRepository);

    await user.click(
      await screen.findByRole('button', {
        name: /φυλάσσειν image region on f\. 1r/,
      }),
    );

    expect(
      screen.getByText(/to keep the watches \/ guard posts/),
    ).toBeInTheDocument();
    expect(screen.getByText('Canvas: f. 1r')).toBeInTheDocument();
  });

  it('layer toggles hide matching manuscript image regions', async () => {
    const user = userEvent.setup();
    renderEvidencePanel(codexSinaiticus, staticEvidenceRepository);

    await screen.findByRole('button', {
      name: /φυλάσσειν image region on f\. 1r/,
    });
    await user.click(screen.getByRole('button', { name: 'Translations' }));

    expect(
      screen.queryByRole('button', {
        name: /φυλάσσειν image region on f\. 1r/,
      }),
    ).not.toBeInTheDocument();
  });

  it('shows an empty state for sources with no units', async () => {
    const emptyRepository: EvidenceRepository = {
      async getEvidenceBySourceSlug(slug) {
        return {
          ...staticEvidenceReviews[0]!,
          sourceSlug: slug,
          title: 'Empty evidence review',
          units: [],
        };
      },
    };

    renderEvidencePanel(deadSeaScrolls, emptyRepository);

    expect(await screen.findByText('No evidence text')).toBeInTheDocument();
    expect(
      screen.getByText('No evidence text is available for this source yet.'),
    ).toBeInTheDocument();
  });
});

function renderEvidencePanel(
  source: HistoricalSource,
  evidenceRepository: EvidenceRepository,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EvidenceReviewPanel
        evidenceRepository={evidenceRepository}
        source={source}
      />
    </QueryClientProvider>,
  );
}
