import type { Preview } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AtlasTheme } from "@moritzbrantner/ui";
import { type ReactNode, useState } from "react";

import "@moritzbrantner/ui/atlas/styles.css";
import "@moritzbrantner/maps/styles.css";
import "../src/styles.css";

function StoryProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 30 * 60 * 1000,
            retry: false,
            staleTime: Infinity,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AtlasTheme className="min-h-screen bg-slate-100 text-slate-900">{children}</AtlasTheme>
    </QueryClientProvider>
  );
}

const preview: Preview = {
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
  parameters: {
    a11y: {
      context: "#storybook-root",
      test: "todo",
    },
    controls: {
      expanded: true,
    },
  },
};

export default preview;
