import type { AppLocale } from '@moritzbrantner/app-pack';

import {
  RestDataTable,
  type RestDataColumn,
} from '@/apps/showcase/components/rest-data-table';
import { employees, type Employee } from '@/apps/showcase/data/employees';
import { isGithubPagesBuild } from '@/src/runtime/build-target';
import { createTranslator } from '@/src/i18n/messages';

export default function TablePage({ locale }: { locale: AppLocale }) {
  const t = createTranslator(locale, 'TablePage');
  const employeeColumns: Array<RestDataColumn<Employee>> = [
    { key: 'id', header: t('columns.id'), valueType: 'number' },
    { key: 'firstName', header: t('columns.firstName') },
    { key: 'lastName', header: t('columns.lastName') },
    { key: 'birthday', header: t('columns.birthday'), valueType: 'date' },
    { key: 'email', header: t('columns.email') },
    { key: 'salary', header: t('columns.salary'), valueType: 'currency' },
    { key: 'active', header: t('columns.active'), valueType: 'boolean' },
    { key: 'team', header: t('columns.team') },
    { key: 'startDate', header: t('columns.startDate'), valueType: 'date' },
    { key: 'bonusEligible', header: t('columns.bonus'), valueType: 'boolean' },
    { key: 'managerId', header: t('columns.managerId'), valueType: 'number' },
  ];

  return (
    <section className="flex min-h-[calc(100vh-8.5rem)] w-full flex-col">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">
        {t('title')}
      </h1>
      <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {isGithubPagesBuild ? (
          <RestDataTable<Employee>
            initialRows={employees}
            columns={employeeColumns}
          />
        ) : (
          <RestDataTable<Employee>
            endpoint="/api/examples/employees"
            columns={employeeColumns}
          />
        )}
      </div>
    </section>
  );
}
