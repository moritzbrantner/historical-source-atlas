// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  HistoricalSource,
  SourceKind,
} from '../../entities/source/model/sourceTypes';
import { SourceComparison } from './SourceComparison';

const currentSource = sourceFixture({
  id: 'current-source',
  kind: 'manuscript',
  label: 'Current Source',
  region: 'Shared Region',
  sourceYear: -300,
});
const sameRegionSource = sourceFixture({
  id: 'same-region',
  kind: 'text',
  label: 'Same Region Source',
  region: 'Shared Region',
  sourceYear: -280,
});
const sameKindSource = sourceFixture({
  id: 'same-kind',
  kind: 'manuscript',
  label: 'Same Kind Source',
  region: 'Other Region',
  sourceYear: -290,
});
const distantSource = sourceFixture({
  id: 'distant-source',
  kind: 'archive',
  label: 'Distant Source',
  region: 'Distant Region',
  sourceYear: 1200,
});

afterEach(() => {
  cleanup();
});

describe('SourceComparison', () => {
  it('selects the strongest comparison candidate by default', () => {
    render(
      <SourceComparison
        source={currentSource}
        sources={[
          currentSource,
          distantSource,
          sameKindSource,
          sameRegionSource,
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Compare Sources' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Compare with')).toHaveValue('same-region');
    expect(screen.getByText('Same region')).toBeInTheDocument();
    expect(screen.getByText('Different kinds')).toBeInTheDocument();
  });

  it('updates comparison rows when another source is selected', async () => {
    const user = userEvent.setup();
    render(
      <SourceComparison
        source={currentSource}
        sources={[currentSource, sameRegionSource, sameKindSource]}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Compare with'), [
      'same-kind',
    ]);

    expect(screen.getByLabelText('Compare with')).toHaveValue('same-kind');
    expect(screen.getByText('Same kind')).toBeInTheDocument();
    expect(screen.getByText('Different regions')).toBeInTheDocument();
  });

  it('opens the selected comparison source', async () => {
    const user = userEvent.setup();
    const onOpenSource = vi.fn();
    render(
      <SourceComparison
        source={currentSource}
        sources={[currentSource, sameRegionSource, sameKindSource]}
        onOpenSource={onOpenSource}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Compare with'), [
      'same-kind',
    ]);
    await user.click(
      screen.getByRole('button', { name: 'Open compared source' }),
    );

    expect(onOpenSource).toHaveBeenCalledWith('same-kind');
  });
});

function sourceFixture({
  id,
  kind,
  label,
  region,
  sourceYear,
}: {
  id: string;
  kind: SourceKind;
  label: string;
  region: string;
  sourceYear: number;
}): HistoricalSource {
  return {
    id,
    label,
    latitude: 1,
    longitude: 2,
    metrics: { importance: 5 },
    properties: {
      currentRepository: `${label} Repository`,
      discovered: '1900',
      discoveredYear: 1900,
      discoveryContext: `${label} discovery context`,
      kind,
      location: `${label} Location`,
      period:
        sourceYear < 0 ? `${Math.abs(sourceYear)} BC` : `${sourceYear} AD`,
      referencedIn: [
        { label: 'Catalogue', note: 'Catalogued', relation: 'catalogued in' },
      ],
      references: [
        {
          label: 'Tradition',
          note: 'References tradition',
          relation: 'references',
        },
      ],
      region,
      sourceYear,
      summary: `${label} summary`,
    },
  };
}
