import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sourceTagQueryKeys } from '../../source-tags/api/sourceTagQueries';
import type {
  AtlasCollection,
  AtlasCollectionsResponse,
} from '../model/collections';

export const collectionQueryKeys = {
  all: ['atlas-collections'] as const,
  list: () => [...collectionQueryKeys.all, 'list'] as const,
};

export type CreateAtlasCollectionInput = {
  isPublic: boolean;
  name: string;
  notes?: string | null;
};

export type UpdateAtlasCollectionInput = CreateAtlasCollectionInput & {
  collectionId: string;
};

export type AddAtlasCollectionItemInput = {
  collectionId: string;
  note?: string | null;
  sourceId: string;
};

export type ReplaceAtlasCollectionItemsInput = {
  collectionId: string;
  items: Array<{
    note?: string | null;
    sourceId: string;
  }>;
};

function isStaticAtlasDataMode() {
  return process.env.NEXT_PUBLIC_ATLAS_DATA_MODE === 'static';
}

async function readProblemDetail(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail;
  } catch {
    return null;
  }
}

async function readAtlasCollections(): Promise<AtlasCollectionsResponse> {
  const response = await fetch('/api/atlas/collections', {
    headers: {
      accept: 'application/json',
    },
  });

  if (response.status === 404 && isStaticAtlasDataMode()) {
    return {
      authenticated: false,
      collections: [],
    };
  }

  if (!response.ok) {
    throw new Error(
      `Atlas collections API request failed with ${response.status}`,
    );
  }

  return response.json() as Promise<AtlasCollectionsResponse>;
}

async function readCollectionResponse(response: Response) {
  if (!response.ok) {
    const detail = await readProblemDetail(response);
    throw new Error(
      detail ?? `Atlas collections API request failed with ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    collection: AtlasCollection;
    ok: true;
  };

  return payload.collection;
}

async function createAtlasCollection(input: CreateAtlasCollectionInput) {
  return readCollectionResponse(
    await fetch('/api/atlas/collections', {
      body: JSON.stringify(input),
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      method: 'POST',
    }),
  );
}

async function updateAtlasCollection(input: UpdateAtlasCollectionInput) {
  return readCollectionResponse(
    await fetch(
      `/api/atlas/collections/${encodeURIComponent(input.collectionId)}`,
      {
        body: JSON.stringify({
          isPublic: input.isPublic,
          name: input.name,
          notes: input.notes,
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        method: 'PATCH',
      },
    ),
  );
}

async function addAtlasCollectionItem(input: AddAtlasCollectionItemInput) {
  return readCollectionResponse(
    await fetch(
      `/api/atlas/collections/${encodeURIComponent(input.collectionId)}/items`,
      {
        body: JSON.stringify({
          note: input.note,
          sourceId: input.sourceId,
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    ),
  );
}

async function replaceAtlasCollectionItems(
  input: ReplaceAtlasCollectionItemsInput,
) {
  return readCollectionResponse(
    await fetch(
      `/api/atlas/collections/${encodeURIComponent(input.collectionId)}/items`,
      {
        body: JSON.stringify({
          items: input.items,
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        method: 'PUT',
      },
    ),
  );
}

export function useAtlasCollectionsQuery() {
  return useQuery({
    enabled: !isStaticAtlasDataMode(),
    queryFn: readAtlasCollections,
    queryKey: collectionQueryKeys.list(),
  });
}

function useCollectionMutation<TInput>(
  mutationFn: (input: TInput) => Promise<AtlasCollection>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: collectionQueryKeys.list() }),
        queryClient.invalidateQueries({ queryKey: sourceTagQueryKeys.list() }),
      ]);
    },
  });
}

export function useCreateAtlasCollectionMutation() {
  return useCollectionMutation(createAtlasCollection);
}

export function useUpdateAtlasCollectionMutation() {
  return useCollectionMutation(updateAtlasCollection);
}

export function useAddAtlasCollectionItemMutation() {
  return useCollectionMutation(addAtlasCollectionItem);
}

export function useReplaceAtlasCollectionItemsMutation() {
  return useCollectionMutation(replaceAtlasCollectionItems);
}
