'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AtlasTheme } from '@moritzbrantner/ui';
import { type ReactNode, useState } from 'react';

export function AtlasProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 30 * 60 * 1000,
            retry: false,
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AtlasTheme className="atlas-app min-h-screen bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </AtlasTheme>
    </QueryClientProvider>
  );
}
