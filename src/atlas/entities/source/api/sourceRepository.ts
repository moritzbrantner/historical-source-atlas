import type { HistoricalSource } from '../model/sourceTypes';

export type SourceRepository = {
  getSourceBySlug: (slug: string) => Promise<HistoricalSource | null>;
  listAtlasSources: () => Promise<HistoricalSource[]>;
};
