import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AtlasSourceTagGroup,
  AtlasSourceTagsResponse,
} from '../model/sourceTags';

export const sourceTagQueryKeys = {
  all: ['atlas-source-tags'] as const,
  list: () => [...sourceTagQueryKeys.all, 'list'] as const,
};

export type ReplaceAtlasSourceTagsInput = {
  sourceId: string;
  tags: string[];
};

function isStaticAtlasDataMode() {
  return process.env.NEXT_PUBLIC_ATLAS_DATA_MODE === 'static';
}

async function readAtlasSourceTags(): Promise<AtlasSourceTagsResponse> {
  const response = await fetch('/api/atlas/tags', {
    headers: {
      accept: 'application/json',
    },
  });

  if (response.status === 404 && isStaticAtlasDataMode()) {
    return {
      authenticated: false,
      tags: [],
    };
  }

  if (!response.ok) {
    throw new Error(`Atlas tag API request failed with ${response.status}`);
  }

  return response.json() as Promise<AtlasSourceTagsResponse>;
}

async function replaceAtlasSourceTags(
  input: ReplaceAtlasSourceTagsInput,
): Promise<AtlasSourceTagGroup> {
  const response = await fetch('/api/atlas/tags', {
    body: JSON.stringify(input),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    method: 'PUT',
  });

  if (!response.ok) {
    const detail = await readProblemDetail(response);
    throw new Error(
      detail ?? `Atlas tag API request failed with ${response.status}`,
    );
  }

  const payload = (await response.json()) as {
    ok: true;
    sourceId: string;
    tags: string[];
  };

  return {
    sourceId: payload.sourceId,
    tags: payload.tags,
  };
}

async function readProblemDetail(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail;
  } catch {
    return null;
  }
}

export function useAtlasSourceTagsQuery() {
  return useQuery({
    enabled: !isStaticAtlasDataMode(),
    queryFn: readAtlasSourceTags,
    queryKey: sourceTagQueryKeys.list(),
  });
}

export function useReplaceAtlasSourceTagsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replaceAtlasSourceTags,
    onSuccess(updatedTagGroup) {
      queryClient.setQueryData<AtlasSourceTagsResponse>(
        sourceTagQueryKeys.list(),
        (current) => {
          const currentTags = current?.tags ?? [];
          const tags = currentTags.filter(
            (tagGroup) => tagGroup.sourceId !== updatedTagGroup.sourceId,
          );

          if (updatedTagGroup.tags.length > 0) {
            tags.push(updatedTagGroup);
          }

          tags.sort((left, right) =>
            left.sourceId.localeCompare(right.sourceId),
          );

          return {
            authenticated: true,
            tags,
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['atlas-collections'] });
    },
  });
}
