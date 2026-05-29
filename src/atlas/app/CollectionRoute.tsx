import {
  Badge,
  Button,
  PageContent,
  PageDescription,
  PageHeader,
  PageShell,
  PageTitle,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { sourceKindLabels } from '../entities/source/model/sourceConstants';
import type { HistoricalSource } from '../entities/source/model/sourceTypes';
import {
  getPublicAtlasCollectionByShareSlug,
  type PublicAtlasCollection,
} from '../server/atlasCollections';
import { getAtlasSourceFromDb } from '../server/atlasSourceRepository';
import { getSourcePath } from './routing';

type CollectionSource = {
  note: string | null;
  source: HistoricalSource;
};

export async function CollectionRoute({ shareSlug }: { shareSlug: string }) {
  const collection = await getPublicAtlasCollectionByShareSlug(shareSlug);

  if (!collection) {
    notFound();
  }

  const collectionSources = await readCollectionSources(collection);

  return (
    <PageShell className="min-h-screen" maxWidth="wide">
      <nav aria-label="Collection page navigation">
        <Button asChild variant="secondary">
          <Link href="/atlas">Back to atlas</Link>
        </Button>
      </nav>

      <PageHeader>
        <p className="mb-2 text-xs font-bold uppercase text-teal-700">
          Shared atlas collection
        </p>
        <PageTitle>{collection.name}</PageTitle>
        <PageDescription>
          Curated by {collection.owner.name ?? `@${collection.owner.tag}`} from
          the Historical Source Atlas.
        </PageDescription>
      </PageHeader>

      <PageContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="grid gap-4">
          {collection.notes ? (
            <Surface>
              <SurfaceHeader>
                <SurfaceTitle>Collection notes</SurfaceTitle>
              </SurfaceHeader>
              <SurfaceContent>
                <p className="leading-7 text-slate-600">{collection.notes}</p>
              </SurfaceContent>
            </Surface>
          ) : null}

          <Surface>
            <SurfaceHeader>
              <SurfaceTitle>Sources</SurfaceTitle>
            </SurfaceHeader>
            <SurfaceContent>
              {collectionSources.length > 0 ? (
                <ol className="grid gap-3">
                  {collectionSources.map(({ note, source }, index) => (
                    <li
                      className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                      key={source.id}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          {index + 1}
                        </span>
                        <Badge>
                          {sourceKindLabels[source.properties.kind]}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-500">
                          {source.properties.region}
                        </span>
                      </div>
                      <div className="grid gap-2">
                        <Link
                          className="text-lg font-bold text-slate-950 no-underline hover:text-teal-700"
                          href={getSourcePath(source.id)}
                        >
                          {source.label}
                        </Link>
                        <p className="leading-7 text-slate-600">
                          {source.properties.summary}
                        </p>
                        {note ? (
                          <p className="rounded-md bg-teal-50 p-3 text-sm font-medium leading-6 text-teal-900">
                            {note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-600">
                  This collection does not include sources yet.
                </p>
              )}
            </SurfaceContent>
          </Surface>
        </article>

        <aside className="grid content-start gap-4">
          <Surface>
            <SurfaceHeader>
              <SurfaceTitle>Details</SurfaceTitle>
            </SurfaceHeader>
            <SurfaceContent>
              <dl className="grid gap-3">
                <CollectionFact
                  label="Sources"
                  value={String(collectionSources.length)}
                />
                <CollectionFact label="Tag" value={`#${collection.tag}`} />
                <CollectionFact
                  label="Owner"
                  value={collection.owner.name ?? `@${collection.owner.tag}`}
                />
              </dl>
            </SurfaceContent>
          </Surface>
        </aside>
      </PageContent>
    </PageShell>
  );
}

async function readCollectionSources(collection: PublicAtlasCollection) {
  const sources = await Promise.all(
    collection.items.map(async (item): Promise<CollectionSource | null> => {
      const source = await getAtlasSourceFromDb(item.sourceId);

      if (!source) {
        return null;
      }

      return {
        note: item.note,
        source,
      };
    }),
  );

  return sources.filter(
    (source): source is CollectionSource => source !== null,
  );
}

function CollectionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="m-0 text-sm font-semibold leading-5 text-slate-800">
        {value}
      </dd>
    </div>
  );
}
