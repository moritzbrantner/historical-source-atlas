import { getAccountCapabilitiesUseCase } from '@/src/domain/account/use-cases';
import { getConsentState } from '@/src/privacy/consent';
import {
  getProfileFollowerVisibilityUseCase,
  getProfileSearchVisibilityUseCase,
  listBlockedProfilesUseCase,
} from '@/src/domain/profile/use-cases';
import { requireAuth, resolveLocale } from '@/src/server/page-guards';

export async function loadSettingsPageData(rawLocale: string) {
  const locale = resolveLocale(rawLocale);
  const session = await requireAuth(locale);
  const [
    visibilityResult,
    followerVisibilityResult,
    blockedProfilesResult,
    accountCapabilities,
    consent,
  ] = await Promise.all([
    getProfileSearchVisibilityUseCase(session.user.id),
    getProfileFollowerVisibilityUseCase(session.user.id),
    listBlockedProfilesUseCase(session.user.id),
    getAccountCapabilitiesUseCase(session.user.id),
    getConsentState(),
  ]);

  return {
    locale,
    session,
    consent: consent.state,
    accountCapabilities,
    initialSearchVisibility: visibilityResult.ok
      ? visibilityResult.data.isSearchable
      : true,
    initialFollowerVisibility: followerVisibilityResult.ok
      ? followerVisibilityResult.data.followerVisibility
      : 'PUBLIC',
    initialBlockedProfiles: blockedProfilesResult.ok
      ? blockedProfilesResult.data.profiles
      : [],
  };
}
