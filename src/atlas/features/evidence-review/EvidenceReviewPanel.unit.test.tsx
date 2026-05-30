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
