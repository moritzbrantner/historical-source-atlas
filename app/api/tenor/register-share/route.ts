import * as z from 'zod';

import { getEnv } from '@/src/config/env';
import { createApiRoute } from '@/src/http/route';

const TENOR_REGISTER_SHARE_ENDPOINT =
  'https://tenor.googleapis.com/v2/registershare';

const bodySchema = z.object({
  id: z.string().trim().min(1).max(128),
  q: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(12).optional(),
});

export const POST = createApiRoute({
  action: 'tenor.registerShare',
  async handler({ request }) {
    let input: unknown;

    try {
      input = await request.json();
    } catch {
      return Response.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400 },
      );
    }

    const parsedBody = bodySchema.safeParse(input);

    if (!parsedBody.success) {
      return Response.json(
        { error: 'Invalid Tenor share payload.' },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    const env = getEnv();

    if (!env.tenor.apiKey) {
      return Response.json({
        ok: false,
        configured: false,
      });
    }

    const url = new URL(TENOR_REGISTER_SHARE_ENDPOINT);
    url.searchParams.set('key', env.tenor.apiKey);
    url.searchParams.set('client_key', env.tenor.clientKey);
    url.searchParams.set('id', body.id);
    url.searchParams.set('q', body.q);
    url.searchParams.set('locale', body.locale ?? 'en_US');

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
    });

    return Response.json({
      ok: response.ok,
      configured: true,
    });
  },
});
