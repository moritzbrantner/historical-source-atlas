import { completeOAuthFlow } from '@/src/auth/oauth/service';
import { isAuthProvider } from '@/src/auth/oauth/providers';
import { createApiRoute } from '@/src/http/route';

export const GET = createApiRoute({
  action: 'auth.oauth.callback',
  async handler({ request, routeContext }) {
    const { params } = routeContext as {
      params: Promise<{ provider: string }>;
    };
    const { provider: rawProvider } = await params;

    if (!isAuthProvider(rawProvider)) {
      return new Response(null, { status: 404 });
    }

    return completeOAuthFlow(rawProvider, request);
  },
});
