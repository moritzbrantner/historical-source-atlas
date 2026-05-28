import { historicalSources } from '../entities/source/api/staticSourceData';
import { historicalSourceToAtlasSourceCard } from '../entities/source/model/sourceMappers';

export const staticAtlasSourceCards = historicalSources.map(
  historicalSourceToAtlasSourceCard,
);
export { historicalSourceToAtlasSourceCard };
