'use client';

import Link from 'next/link';
import {
  Badge,
  Button,
  LoadingState,
  PageContent,
  PageHeader,
  PageShell,
  PageTitle,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';

import { getEntityPath } from '../../app/entityRouting';
import type { EntityType } from '../../domain/dataModel';
import { getEntityDisplayCategory } from '../../domain/atlasTaxonomy';
import type { EntitySummary } from '../../domain/entityModel';
import type {
  AtlasEntityDetail,
  EntityMentionContext,
  EntityRelationView,
} from '../../domain/entityPageModel';
import { useAtlasEntityQuery } from '../../entities/entity/api/entityQueries';
import type { EntityRepository } from '../../entities/entity/api/entityRepository';
import { getSourcePath } from '../../app/routing';
import { EmptyState } from '../../shared/ui/EmptyState';

export function EntityPage({
  entityRepository,
  onBackToAtlas,
  onOpenEntity,
  onOpenSource,
  slug,
}: {
  entityRepository?: EntityRepository;
  onBackToAtlas: () => void;
  onOpenEntity: (entity: {
    agentKind?: string | null;
    slug: string;
    type: EntityType;
  }) => void;
  onOpenSource: (sourceSlug: string) => void;
  slug: string;
}) {
  const entityQuery = useAtlasEntityQuery(slug, entityRepository);
  const detail = entityQuery.data;

  if (entityQuery.isLoading) {
    return (
      <PageShell maxWidth="wide">
        <LoadingState label="Loading entity page" />
      </PageShell>
    );
  }

  if (!detail) {
    return (
      <PageShell maxWidth="wide">
        <nav aria-label="Entity page navigation">
          <Button type="button" variant="secondary" onClick={onBackToAtlas}>
            Back to atlas
          </Button>
        </nav>
        <EmptyState
          description="Open a referenced text, person, place, event, or object from an atlas source."
          title="Entity not found"
        />
      </PageShell>
    );
  }

  const canonicalPath = getEntityPath({
    agentKind:
      detail.typed?.type === 'agent' ? detail.typed.agentKind : undefined,
    slug: detail.entity.slug,
    type: detail.entity.type,
  });

  return (
    <PageShell className="min-h-screen" maxWidth="wide">
      <nav
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Entity page navigation"
      >
        <Button type="button" variant="secondary" onClick={onBackToAtlas}>
          Back to atlas
        </Button>
        <Link
          className="truncate text-sm font-semibold text-slate-500 no-underline"
          href={canonicalPath}
        >
          {canonicalPath}
        </Link>
      </nav>

      <PageHeader className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <div className="grid content-center gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{displayCategory(detail)}</Badge>
            <span className="text-sm font-semibold text-slate-500">
              {detail.entity.type.replaceAll('_', ' ')}
            </span>
          </div>
          <PageTitle>{detail.entity.preferredLabel}</PageTitle>
          {detail.entity.summary || detail.entity.description ? (
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              {detail.entity.summary ?? detail.entity.description}
            </p>
          ) : null}
        </div>
        <Surface>
          <SurfaceHeader>
            <SurfaceTitle>Facts</SurfaceTitle>
          </SurfaceHeader>
          <SurfaceContent>
            <FactList detail={detail} />
          </SurfaceContent>
        </Surface>
      </PageHeader>

      <PageContent>
        <section
          className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,410px)]"
          aria-label={`${detail.entity.preferredLabel} entity page`}
        >
          <article className="grid gap-4">
            <RelationPanel
              incomingRelations={detail.incomingRelations}
              outgoingRelations={detail.outgoingRelations}
            />
            <MentionsPanel mentions={detail.mentions} />
            <TypeSpecificPanel detail={detail} />
          </article>
          <aside className="grid gap-4">
            <LinkedSourcesPanel detail={detail} onOpenSource={onOpenSource} />
            <AliasesPanel detail={detail} />
          </aside>
        </section>
      </PageContent>
    </PageShell>
  );
}

function FactList({ detail }: { detail: AtlasEntityDetail }) {
  if (detail.facts.length === 0) {
    return <p className="m-0 text-sm text-slate-500">No facts available.</p>;
  }

  return (
    <dl className="m-0 grid gap-3">
      {detail.facts.map((fact) => (
        <div
          className="grid grid-cols-[110px_minmax(0,1fr)] gap-3"
          key={`${fact.label}-${fact.value}`}
        >
          <dt className="text-xs font-semibold uppercase text-slate-500">
            {fact.label}
          </dt>
          <dd className="m-0 min-w-0 text-sm font-semibold leading-5 text-slate-800">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LinkedSourcesPanel({
  detail,
  onOpenSource,
}: {
  detail: AtlasEntityDetail;
  onOpenSource: (sourceSlug: string) => void;
}) {
  return (
    <Surface>
      <SurfaceHeader>
        <SurfaceTitle>Linked Sources</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent>
        {detail.linkedSources.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">
            No atlas sources link to this entity yet.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {detail.linkedSources.map((source) => (
              <li
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3"
                key={source.slug}
              >
                <button
                  className="border-0 bg-transparent p-0 text-left text-sm font-bold text-slate-950 hover:text-teal-700"
                  onClick={() => {
                    onOpenSource(source.slug);
                  }}
                  type="button"
                >
                  {source.label}
                </button>
                {source.summary ? (
                  <p className="m-0 text-sm leading-6 text-slate-600">
                    {source.summary}
                  </p>
                ) : null}
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {source.kind}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SurfaceContent>
    </Surface>
  );
}

function RelationPanel({
  incomingRelations,
  outgoingRelations,
}: {
  incomingRelations: EntityRelationView[];
  outgoingRelations: EntityRelationView[];
}) {
  return (
    <Surface>
      <SurfaceHeader>
        <SurfaceTitle>Reference Network</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent>
        <div className="grid gap-3 md:grid-cols-2">
          <RelationList relations={incomingRelations} title="Referenced by" />
          <RelationList relations={outgoingRelations} title="References" />
        </div>
      </SurfaceContent>
    </Surface>
  );
}

function RelationList({
  relations,
  title,
}: {
  relations: EntityRelationView[];
  title: string;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="m-0 text-xs font-bold uppercase text-slate-500">
        {title}
      </h3>
      {relations.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No references yet.</p>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {relations.map((relation) => (
            <li
              className="grid gap-1 rounded-md border border-slate-200 bg-white p-3"
              key={`${title}-${relation.id}`}
            >
              <Badge>{relation.predicate}</Badge>
              <RelationTarget relation={relation} />
              {relation.note ? (
                <p className="m-0 text-sm leading-5 text-slate-600">
                  {relation.note}
                </p>
              ) : null}
              {relation.certainty ? (
                <p className="m-0 text-xs text-slate-500">
                  Certainty: {relation.certainty}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RelationTarget({ relation }: { relation: EntityRelationView }) {
  if (relation.target) {
    return <EntitySummaryLink entity={relation.target} />;
  }

  if (relation.objectUrl) {
    return (
      <a
        className="text-sm font-semibold text-slate-900 hover:text-teal-700"
        href={relation.objectUrl}
        rel="noreferrer"
        target="_blank"
      >
        {relation.objectLabel ?? relation.objectUrl}
      </a>
    );
  }

  return (
    <strong className="text-sm text-slate-900">
      {relation.objectLabel ?? 'Unspecified target'}
    </strong>
  );
}

function MentionsPanel({ mentions }: { mentions: EntityMentionContext[] }) {
  return (
    <Surface>
      <SurfaceHeader>
        <SurfaceTitle>Text Mentions</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent>
        {mentions.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">
            No text mentions are linked to this entity yet.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {mentions.map((mention) => (
              <li
                className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4"
                key={mention.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>mention</Badge>
                  <strong className="text-sm text-slate-950">
                    {mention.mentionText}
                  </strong>
                  {mention.textUnitLabel ? (
                    <span className="text-xs font-semibold uppercase text-slate-500">
                      {mention.textUnitLabel}
                    </span>
                  ) : null}
                  {mention.certainty ? (
                    <span className="text-xs text-slate-500">
                      {mention.certainty}
                    </span>
                  ) : null}
                </div>
                {mention.textUnitContent ? (
                  <blockquote className="m-0 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {mention.textUnitContent}
                  </blockquote>
                ) : null}
                <MentionContext mention={mention} />
                {mention.note ? (
                  <p className="m-0 text-sm leading-6 text-slate-600">
                    {mention.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SurfaceContent>
    </Surface>
  );
}

function MentionContext({ mention }: { mention: EntityMentionContext }) {
  const contextItems = [
    mention.source
      ? {
          href: getSourcePath(mention.source.slug),
          label: mention.source.label,
          prefix: 'Source',
        }
      : null,
    mention.work
      ? {
          href: summaryPath(mention.work),
          label: mention.work.preferredLabel,
          prefix: 'Work',
        }
      : null,
    mention.witness
      ? {
          href: summaryPath(mention.witness),
          label: mention.witness.preferredLabel,
          prefix: 'Witness',
        }
      : null,
    mention.edition
      ? {
          href: summaryPath(mention.edition),
          label: mention.edition.preferredLabel,
          prefix: 'Edition',
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      href: string;
      label: string;
      prefix: string;
    } => item !== null,
  );

  if (contextItems.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-slate-500">
      {contextItems.map((item) => (
        <Link
          className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 no-underline hover:bg-teal-50 hover:text-teal-700"
          href={item.href}
          key={`${item.prefix}-${item.href}`}
        >
          {item.prefix}: {item.label}
        </Link>
      ))}
    </div>
  );
}

function TypeSpecificPanel({ detail }: { detail: AtlasEntityDetail }) {
  const typed = detail.typed;

  if (!typed) {
    return null;
  }

  if (typed.type === 'place' && typed.geometry) {
    return (
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Location Geometry</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          <p className="m-0 text-sm leading-6 text-slate-600">
            {typed.geometry.type} geometry is available for this location.
          </p>
        </SurfaceContent>
      </Surface>
    );
  }

  if (typed.type === 'text_witness' && typed.textWork) {
    return (
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Text Chain</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          <EntitySummaryLink entity={typed.textWork} />
        </SurfaceContent>
      </Surface>
    );
  }

  if (typed.type === 'text_edition' && typed.textWitness) {
    return (
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Edition Chain</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          <EntitySummaryLink entity={typed.textWitness} />
        </SurfaceContent>
      </Surface>
    );
  }

  if (typed.type === 'manuscript_unit' && typed.physicalObject) {
    return (
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Carrier</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          <EntitySummaryLink entity={typed.physicalObject} />
        </SurfaceContent>
      </Surface>
    );
  }

  if (typed.type === 'inscription') {
    return (
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Carrier</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent className="grid gap-2">
          {typed.physicalObject ? (
            <EntitySummaryLink entity={typed.physicalObject} />
          ) : null}
          {typed.objectPart ? (
            <EntitySummaryLink entity={typed.objectPart} />
          ) : null}
          {!typed.physicalObject && !typed.objectPart ? (
            <p className="m-0 text-sm text-slate-500">
              No carrier is linked yet.
            </p>
          ) : null}
        </SurfaceContent>
      </Surface>
    );
  }

  if (typed.type === 'asset') {
    return (
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Asset Metadata</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          {typed.sourceUrl ? (
            <a
              className="text-sm font-semibold text-teal-700"
              href={typed.sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open source asset
            </a>
          ) : (
            <p className="m-0 text-sm text-slate-500">
              No public source URL is linked yet.
            </p>
          )}
        </SurfaceContent>
      </Surface>
    );
  }

  return null;
}

function AliasesPanel({ detail }: { detail: AtlasEntityDetail }) {
  return (
    <Surface>
      <SurfaceHeader>
        <SurfaceTitle>Names</SurfaceTitle>
      </SurfaceHeader>
      <SurfaceContent>
        {detail.aliases.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">
            No alternate names are recorded.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {detail.aliases.map((alias) => (
              <li
                className="rounded-md border border-slate-200 bg-white p-3"
                key={alias.id}
              >
                <strong className="text-sm text-slate-900">{alias.name}</strong>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {alias.nameType}
                  {alias.language ? ` · ${alias.language}` : ''}
                  {alias.script ? ` · ${alias.script}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SurfaceContent>
    </Surface>
  );
}

function EntitySummaryLink({ entity }: { entity: EntitySummary }) {
  return (
    <Link
      className="text-sm font-semibold text-slate-900 no-underline hover:text-teal-700"
      href={summaryPath(entity)}
    >
      {entity.preferredLabel}
    </Link>
  );
}

function summaryPath(entity: EntitySummary) {
  return getEntityPath({
    agentKind:
      entity.type === 'agent' &&
      getEntityDisplayCategory({
        agentKind: entity.displayCategory,
        type: entity.type,
      }).id === 'person'
        ? 'person'
        : undefined,
    slug: entity.slug,
    type: entity.type,
  });
}

function displayCategory(detail: AtlasEntityDetail) {
  return getEntityDisplayCategory({
    agentKind:
      detail.typed?.type === 'agent' ? detail.typed.agentKind : undefined,
    eventKind:
      detail.typed?.type === 'event' ? detail.typed.eventKind : undefined,
    placeKind:
      detail.typed?.type === 'place' ? detail.typed.placeKind : undefined,
    type: detail.entity.type,
  }).label;
}
