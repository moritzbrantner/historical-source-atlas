import {
  EmptyState as UiEmptyState,
  StateViewActions,
  StateViewDescription,
  StateViewTitle,
} from '@moritzbrantner/ui';
import type { ReactNode } from 'react';

export function EmptyState({
  actions,
  description,
  title,
}: {
  actions?: ReactNode;
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <UiEmptyState className="min-h-44 rounded-lg border border-slate-200 bg-white">
      <StateViewTitle>{title}</StateViewTitle>
      <StateViewDescription>{description}</StateViewDescription>
      {actions ? <StateViewActions>{actions}</StateViewActions> : null}
    </UiEmptyState>
  );
}
