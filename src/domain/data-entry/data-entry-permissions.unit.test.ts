import { describe, expect, it } from 'vitest';

import {
  canReadTable,
  canWriteTable,
  managedTables,
} from '@/src/domain/data-entry/table-permissions';
import { getTablePermissionViews } from '@/src/domain/data-entry/use-cases';

describe('data-entry table permissions', () => {
  it.each(['USER', 'MANAGER', 'ADMIN'] as const)(
    'does not expose schema tables to %s users',
    (role) => {
      expect(getTablePermissionViews(role)).toEqual([]);

      for (const table of managedTables) {
        expect(canReadTable(role, table)).toBe(false);
        expect(canWriteTable(role, table)).toBe(false);
      }
    },
  );

  it.each(['SUPERADMIN'] as const)(
    'allows %s users to read and write managed schema tables',
    (role) => {
      expect(getTablePermissionViews(role)).toHaveLength(managedTables.length);

      for (const table of managedTables) {
        expect(canReadTable(role, table)).toBe(true);
        expect(canWriteTable(role, table)).toBe(true);
      }
    },
  );
});
