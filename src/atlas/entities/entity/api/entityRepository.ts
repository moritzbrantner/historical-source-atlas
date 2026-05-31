import type { EntityType } from '../../../domain/dataModel';
import type {
  AtlasEntityDetail,
  EntityMentionContext,
  EntityRelationView,
} from '../../../domain/entityPageModel';
import type { EntitySummary } from '../../../domain/entityModel';
import type { AtlasSourceCard } from '../../../domain/dataModel';

export type AtlasEntityFilters = {
  kind?: string | null;
  query?: string | null;
  type?: EntityType | null;
};

export type EntityRepository = {
  getEntityBySlug: (slug: string) => Promise<AtlasEntityDetail | null>;
  getEntityLinkedSources: (slug: string) => Promise<AtlasSourceCard[] | null>;
  getEntityMentions: (slug: string) => Promise<EntityMentionContext[] | null>;
  getEntityRelations: (slug: string) => Promise<{
    incomingRelations: EntityRelationView[];
    outgoingRelations: EntityRelationView[];
  } | null>;
  listEntities: (filters?: AtlasEntityFilters) => Promise<EntitySummary[]>;
};
