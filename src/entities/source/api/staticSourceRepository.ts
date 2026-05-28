import type { SourceRepository } from "./sourceRepository";
import { historicalSources } from "./staticSourceData";

const sourceBySlug = new Map(historicalSources.map((source) => [source.id, source]));

export const staticSourceRepository: SourceRepository = {
  async getSourceBySlug(slug) {
    return sourceBySlug.get(slug) ?? null;
  },
  async listAtlasSources() {
    return historicalSources;
  },
};
