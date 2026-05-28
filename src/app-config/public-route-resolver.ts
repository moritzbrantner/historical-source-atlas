import {
  generatePublicRouteParams,
  getPublicPageNamespaces,
  resolvePublicRoute,
} from '@moritzbrantner/app-pack';

import type { AppManifest } from '@/src/app-config/contracts';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';

export {
  generatePublicRouteParams,
  getPublicPageNamespaces,
  resolvePublicRoute,
};

export function resolveEnabledPublicRoute(
  manifest: AppManifest,
  slug: readonly string[] | string | undefined | null,
) {
  const resolvedRoute = resolvePublicRoute(manifest, slug);

  if (!resolvedRoute) {
    return null;
  }

  if (
    resolvedRoute.page.featureKey &&
    !isFeatureEnabled(resolvedRoute.page.featureKey, manifest)
  ) {
    return null;
  }

  return resolvedRoute;
}
