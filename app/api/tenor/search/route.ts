import * as z from 'zod';

import { getEnv } from '@/src/config/env';
import { createApiRoute } from '@/src/http/route';

const TENOR_SEARCH_ENDPOINT = 'https://tenor.googleapis.com/v2/search';

const querySchema = z.object({
  q: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(12).optional(),
});

type TenorMediaFormat = {
  url?: string;
  dims?: [number, number];
};

type TenorResult = {
  id?: string;
  title?: string;
  content_description?: string;
  itemurl?: string;
  media_formats?: {
    gif?: TenorMediaFormat;
    tinygif?: TenorMediaFormat;
    nanogif?: TenorMediaFormat;
  };
};

type TenorResponse = {
  results?: TenorResult[];
};

function toGifResult(result: TenorResult, query: string) {
  const gif = result.media_formats?.gif;
  const tinygif = result.media_formats?.tinygif;
  const nanogif = result.media_formats?.nanogif;
  const preview = tinygif ?? nanogif ?? gif;
  const share = gif ?? tinygif ?? nanogif;

  if (!result.id || !preview?.url || !share?.url) {
    return null;
  }

  return {
    id: result.id,
    title: result.content_description ?? result.title ?? 'Tenor GIF',
    previewUrl: preview.url,
    gifUrl: share.url,
    tenorUrl: result.itemurl ?? `https://tenor.com/view/${result.id}`,
    width: preview.dims?.[0] ?? 320,
    height: preview.dims?.[1] ?? 240,
    query,
  };
}

export const GET = createApiRoute({
  action: 'tenor.search',
  async handler({ request }) {
    const parsedQuery = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!parsedQuery.success) {
      return Response.json(
        { error: 'Invalid Tenor search query.' },
        { status: 400 },
      );
    }

    const query = parsedQuery.data;
    const env = getEnv();

    if (!env.tenor.apiKey) {
      return Response.json({
        configured: false,
        results: [],
      });
    }

    const url = new URL(TENOR_SEARCH_ENDPOINT);
    url.searchParams.set('key', env.tenor.apiKey);
    url.searchParams.set('client_key', env.tenor.clientKey);
    url.searchParams.set('q', query.q);
    url.searchParams.set('locale', query.locale ?? 'en_US');
    url.searchParams.set(
      'country',
      query.locale?.endsWith('_DE') ? 'DE' : 'US',
    );
    url.searchParams.set('contentfilter', 'medium');
    url.searchParams.set('media_filter', 'gif,tinygif,nanogif');
    url.searchParams.set('limit', '12');

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Unable to search Tenor.' },
        { status: 502 },
      );
    }

    const data = (await response.json()) as TenorResponse;

    return Response.json({
      configured: true,
      results: (data.results ?? [])
        .map((result) => toGifResult(result, query.q))
        .filter(
          (result): result is NonNullable<ReturnType<typeof toGifResult>> =>
            Boolean(result),
        ),
    });
  },
});
