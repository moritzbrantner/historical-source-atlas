import {
  beginOAuthFlow,
  resolveOAuthFlowContext,
} from '@/src/auth/oauth/service';
import { isAuthProvider } from '@/src/auth/oauth/providers';
import { createApiRoute } from '@/src/http/route';

export const GET = createApiRoute({
  action: 'auth.oauth.start',
  async handler({ request, routeContext }) {
    const { params } = routeContext as {
      params: Promise<{ provider: string }>;
    };
    const { provider: rawProvider } = await params;

    if (!isAuthProvider(rawProvider)) {
      return new Response(null, { status: 404 });
    }

    const requestUrl = new URL(request.url);

    return beginOAuthFlow(
      rawProvider,
      resolveOAuthFlowContext({
        locale: requestUrl.searchParams.get('locale'),
        returnTo: requestUrl.searchParams.get('returnTo'),
      }),
    );
  },
});
