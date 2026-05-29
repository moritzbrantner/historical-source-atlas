import {
  Badge,
  Button,
  Surface,
  SurfaceContent,
  SurfaceHeader,
  SurfaceTitle,
} from '@moritzbrantner/ui';
import {
  ArrowDown,
  ArrowUp,
  Folder,
  Plus,
  Save,
  Share2,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AtlasCollection } from '../../entities/collections/model/collections';
import { buildAtlasCollectionSharePath } from '../../entities/collections/model/collections';
import type { HistoricalSource } from '../../entities/source/model/sourceTypes';

type CollectionDraft = {
  isPublic: boolean;
  name: string;
  notes: string;
};

type CollectionItemsDraft = Array<{
  note: string;
  sourceId: string;
}>;

const inputClassName =
  'min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20';

const textareaClassName =
  'min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20';

export function AtlasCollectionsPanel({
  authenticated,
  collections,
  error,
  loading,
  onAddSource,
  onCreate,
  onReplaceItems,
  onSelectSource,
  onUpdate,
  saving,
  selectedSource,
  sources,
}: {
  authenticated: boolean;
  collections: AtlasCollection[];
  error: string | null;
  loading: boolean;
  onAddSource: (input: {
    collectionId: string;
    note?: string | null;
    sourceId: string;
  }) => Promise<unknown>;
  onCreate: (input: CollectionDraft) => Promise<unknown>;
  onReplaceItems: (
    collectionId: string,
    items: CollectionItemsDraft,
  ) => Promise<unknown>;
  onSelectSource: (sourceId: string) => void;
  onUpdate: (collectionId: string, input: CollectionDraft) => Promise<unknown>;
  saving: boolean;
  selectedSource: HistoricalSource | undefined;
  sources: HistoricalSource[];
}) {
  const [createDraft, setCreateDraft] = useState<CollectionDraft>({
    isPublic: false,
    name: '',
    notes: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const sourcesById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  if (loading) {
    return (
      <Surface aria-label="Saved collections">
        <SurfaceHeader>
          <SurfaceTitle>Saved collections</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          <p className="text-sm text-slate-600">Loading your collections...</p>
        </SurfaceContent>
      </Surface>
    );
  }

  if (!authenticated) {
    return (
      <Surface aria-label="Saved collections">
        <SurfaceHeader>
          <SurfaceTitle>Saved collections</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceContent>
          <p className="text-sm text-slate-600">
            Sign in to turn tags into named collections with notes and public
            share pages.
          </p>
        </SurfaceContent>
      </Surface>
    );
  }

  return (
    <Surface aria-label="Saved collections">
      <SurfaceHeader>
        <div className="flex items-center justify-between gap-3">
          <SurfaceTitle>Saved collections</SurfaceTitle>
          <Badge>{collections.length}</Badge>
        </div>
      </SurfaceHeader>
      <SurfaceContent className="grid gap-4">
        <form
          className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            setLocalError(null);
            onCreate(createDraft)
              .then(() => {
                setCreateDraft({
                  isPublic: false,
                  name: '',
                  notes: '',
                });
              })
              .catch((cause: unknown) => {
                setLocalError(
                  cause instanceof Error
                    ? cause.message
                    : 'Could not create collection.',
                );
              });
          }}
        >
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>Name</span>
            <input
              className={inputClassName}
              placeholder="Dead Sea material"
              value={createDraft.name}
              onChange={(event) => {
                setCreateDraft((draft) => ({
                  ...draft,
                  name: event.target.value,
                }));
              }}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>Notes</span>
            <textarea
              className={textareaClassName}
              placeholder="Why this collection matters"
              value={createDraft.notes}
              onChange={(event) => {
                setCreateDraft((draft) => ({
                  ...draft,
                  notes: event.target.value,
                }));
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              checked={createDraft.isPublic}
              type="checkbox"
              onChange={(event) => {
                setCreateDraft((draft) => ({
                  ...draft,
                  isPublic: event.target.checked,
                }));
              }}
            />
            Public share page
          </label>
          {localError || error ? (
            <p className="text-sm font-semibold text-red-700">
              {localError ?? error}
            </p>
          ) : null}
          <Button disabled={saving} type="submit" variant="secondary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Create collection
          </Button>
        </form>

        {collections.length === 0 ? (
          <p className="text-sm text-slate-600">
            Create a collection with the same name as one of your tags to import
            matching sources.
          </p>
        ) : (
          <div className="grid max-h-[520px] gap-3 overflow-auto pr-1">
            {collections.map((collection) => (
              <CollectionEditor
                collection={collection}
                key={collection.id}
                saving={saving}
                selectedSource={selectedSource}
                sourcesById={sourcesById}
                onAddSource={onAddSource}
                onReplaceItems={onReplaceItems}
                onSelectSource={onSelectSource}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        )}
      </SurfaceContent>
    </Surface>
  );
}

function CollectionEditor({
  collection,
  onAddSource,
  onReplaceItems,
  onSelectSource,
  onUpdate,
  saving,
  selectedSource,
  sourcesById,
}: {
  collection: AtlasCollection;
  onAddSource: (input: {
    collectionId: string;
    note?: string | null;
    sourceId: string;
  }) => Promise<unknown>;
  onReplaceItems: (
    collectionId: string,
    items: CollectionItemsDraft,
  ) => Promise<unknown>;
  onSelectSource: (sourceId: string) => void;
  onUpdate: (collectionId: string, input: CollectionDraft) => Promise<unknown>;
  saving: boolean;
  selectedSource: HistoricalSource | undefined;
  sourcesById: ReadonlyMap<string, HistoricalSource>;
}) {
  const [draft, setDraft] = useState<CollectionDraft>({
    isPublic: collection.isPublic,
    name: collection.name,
    notes: collection.notes ?? '',
  });
  const [itemsDraft, setItemsDraft] = useState<CollectionItemsDraft>(
    collection.items.map((item) => ({
      note: item.note ?? '',
      sourceId: item.sourceId,
    })),
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSourceIsIncluded =
    selectedSource !== undefined &&
    collection.items.some((item) => item.sourceId === selectedSource.id);

  useEffect(() => {
    setDraft({
      isPublic: collection.isPublic,
      name: collection.name,
      notes: collection.notes ?? '',
    });
    setItemsDraft(
      collection.items.map((item) => ({
        note: item.note ?? '',
        sourceId: item.sourceId,
      })),
    );
    setError(null);
    setStatus(null);
  }, [collection]);

  const sharePath = buildAtlasCollectionSharePath(collection.shareSlug);

  return (
    <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 truncate text-sm font-bold text-slate-950">
            <Folder aria-hidden="true" className="h-4 w-4 text-teal-700" />
            {collection.name}
          </h3>
          <p className="text-xs font-semibold text-slate-500">
            #{collection.tag} · {collection.items.length} sources
          </p>
        </div>
        {collection.isPublic ? (
          <Button
            aria-label={`Copy share link for ${collection.name}`}
            type="button"
            variant="secondary"
            onClick={() => {
              const origin =
                typeof window === 'undefined' ? '' : window.location.origin;
              navigator.clipboard
                ?.writeText(`${origin}${sharePath}`)
                .then(() => {
                  setStatus('Share link copied.');
                })
                .catch(() => {
                  setStatus(sharePath);
                });
            }}
          >
            <Share2 aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setStatus(null);
          onUpdate(collection.id, draft)
            .then(() => {
              setStatus('Collection saved.');
            })
            .catch((cause: unknown) => {
              setError(
                cause instanceof Error
                  ? cause.message
                  : 'Could not save collection.',
              );
            });
        }}
      >
        <input
          className={inputClassName}
          aria-label={`${collection.name} name`}
          value={draft.name}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              name: event.target.value,
            }));
          }}
        />
        <textarea
          className={textareaClassName}
          aria-label={`${collection.name} notes`}
          value={draft.notes}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              notes: event.target.value,
            }));
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              checked={draft.isPublic}
              type="checkbox"
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  isPublic: event.target.checked,
                }));
              }}
            />
            Public
          </label>
          <Button disabled={saving} type="submit" variant="secondary">
            <Save aria-hidden="true" className="h-4 w-4" />
            Save
          </Button>
          {selectedSource && !selectedSourceIsIncluded ? (
            <Button
              disabled={saving}
              type="button"
              variant="secondary"
              onClick={() => {
                setError(null);
                setStatus(null);
                onAddSource({
                  collectionId: collection.id,
                  sourceId: selectedSource.id,
                })
                  .then(() => {
                    setStatus('Source added.');
                  })
                  .catch((cause: unknown) => {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : 'Could not add source.',
                    );
                  });
              }}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add selected
            </Button>
          ) : null}
        </div>
      </form>

      {itemsDraft.length > 0 ? (
        <form
          className="grid gap-2 border-t border-slate-200 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            setStatus(null);
            onReplaceItems(collection.id, itemsDraft)
              .then(() => {
                setStatus('Source order saved.');
              })
              .catch((cause: unknown) => {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : 'Could not save source order.',
                );
              });
          }}
        >
          <ul className="grid gap-2">
            {itemsDraft.map((item, index) => {
              const source = sourcesById.get(item.sourceId);

              return (
                <li
                  className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
                  key={item.sourceId}
                >
                  <div className="flex items-center gap-2">
                    <button
                      className="min-w-0 flex-1 truncate text-left text-sm font-bold text-slate-950 hover:text-teal-700"
                      type="button"
                      onClick={() => {
                        onSelectSource(item.sourceId);
                      }}
                    >
                      {source?.label ?? item.sourceId}
                    </button>
                    <IconButton
                      disabled={index === 0}
                      label={`Move ${source?.label ?? item.sourceId} up`}
                      onClick={() => {
                        setItemsDraft((current) =>
                          moveItem(current, index, index - 1),
                        );
                      }}
                    >
                      <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      disabled={index === itemsDraft.length - 1}
                      label={`Move ${source?.label ?? item.sourceId} down`}
                      onClick={() => {
                        setItemsDraft((current) =>
                          moveItem(current, index, index + 1),
                        );
                      }}
                    >
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={`Remove ${source?.label ?? item.sourceId}`}
                      onClick={() => {
                        setItemsDraft((current) =>
                          current.filter(
                            (draftItem) => draftItem.sourceId !== item.sourceId,
                          ),
                        );
                      }}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <input
                    className={inputClassName}
                    aria-label={`${source?.label ?? item.sourceId} collection note`}
                    placeholder="Source note"
                    value={item.note}
                    onChange={(event) => {
                      setItemsDraft((current) =>
                        current.map((draftItem) =>
                          draftItem.sourceId === item.sourceId
                            ? { ...draftItem, note: event.target.value }
                            : draftItem,
                        ),
                      );
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <Button disabled={saving} type="submit" variant="secondary">
            <Save aria-hidden="true" className="h-4 w-4" />
            Save source notes and order
          </Button>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-red-700">{error}</p>
      ) : null}
      {status ? (
        <p className="text-sm font-semibold text-teal-700">{status}</p>
      ) : null}
    </section>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      disabled={disabled}
      type="button"
      variant="secondary"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);

  return nextItems;
}
