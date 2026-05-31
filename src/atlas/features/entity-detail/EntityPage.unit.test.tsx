// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { staticEntityRepository } from '../../entities/entity/api/staticEntityRepository';
import { EntityPage } from './EntityPage';

afterEach(() => {
  cleanup();
});

describe('EntityPage', () => {
  it('renders facts, relations, linked sources, and text mentions', async () => {
    renderEntityPage('teacher-of-righteousness');

    expect(
      await screen.findByRole('heading', {
        name: 'Teacher of Righteousness',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Kind')).toBeInTheDocument();
    expect(screen.getByText('Dead Sea Scrolls')).toBeInTheDocument();
    expect(screen.getByText('mentioned in')).toBeInTheDocument();
    expect(screen.getByText('Text Mentions')).toBeInTheDocument();
    expect(screen.getByText('1QS I, excerpt')).toBeInTheDocument();
  });

  it('renders an empty state for unknown entities', async () => {
    renderEntityPage('missing-entity');

    expect(await screen.findByText('Entity not found')).toBeInTheDocument();
  });
});

function renderEntityPage(slug: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EntityPage
        entityRepository={staticEntityRepository}
        slug={slug}
        onBackToAtlas={vi.fn()}
        onOpenEntity={vi.fn()}
        onOpenSource={vi.fn()}
      />
    </QueryClientProvider>,
  );
}
