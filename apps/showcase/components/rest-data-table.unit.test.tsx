// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RestDataTable, type RestDataColumn } from './rest-data-table';

type TestEmployee = {
  id: number;
  firstName: string;
  team: string;
  active: boolean;
};

const columns: Array<RestDataColumn<TestEmployee>> = [
  { key: 'id', header: 'ID', valueType: 'number' },
  { key: 'firstName', header: 'First name' },
  { key: 'team', header: 'Team' },
  { key: 'active', header: 'Active', valueType: 'boolean' },
];

const rows: TestEmployee[] = [
  { id: 2, firstName: 'Ava', team: 'Engineering', active: true },
  { id: 1, firstName: 'Noah', team: 'Product', active: false },
];

describe('RestDataTable', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders static rows without fetching endpoint data', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(<RestDataTable columns={columns} initialRows={rows} />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Ava')).toBeInTheDocument();
    expect(screen.getByText('Noah')).toBeInTheDocument();
  });

  it('filters and sorts static rows', () => {
    render(<RestDataTable columns={columns} initialRows={rows} />);

    fireEvent.change(screen.getByLabelText('Filter Team'), {
      target: { value: 'Product' },
    });

    expect(screen.queryByText('Ava')).not.toBeInTheDocument();
    expect(screen.getByText('Noah')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter Team'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ID/ }));

    const dataRows = screen.getAllByRole('row').slice(2);
    expect(dataRows[0]).toHaveTextContent('1');
    expect(dataRows[1]).toHaveTextContent('2');
  });
});
