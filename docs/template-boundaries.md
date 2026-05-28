# Template Boundaries

## Foundation-owned paths

- `src/**`
- `components/**`
- `app/**`
- `lib/**`
- `scripts/**`

Foundation owns runtime plumbing, auth/session, DB, jobs, observability, route wrappers, manifest loading, feature keys, feature guards, navigation composition, support-report triage, and reusable UI primitives.

## App-owned paths

- `app.config.ts`
- `apps/<app>/**`

App packs own public pages, public navigation, public message namespaces, public content roots, branding defaults, and example APIs exposed through the manifest contract.

## Hard rules

- Foundation code must not import from `apps/**` directly. The only allowed seam is [`src/app-config/load-active-app.ts`](/home/moenarch/moritzbrantner/next-template/src/app-config/load-active-app.ts).
- App packs may import from foundation paths, but they must not patch or replace foundation route files in `app/**`.
- App packs must not import from sibling app packs.
- Public route ownership lives in the active `AppManifest`, not in foundation route files or database settings.
- Structural feature availability is code-owned through `AppManifest.enabledFeatures`.
- `app.manifest.ts` is the standalone repo metadata contract; it does not replace the internal `AppManifest` app-pack seam.

## Safe edit zones for downstream repos

- Change the active app by editing [`app.config.ts`](/home/moenarch/moritzbrantner/next-template/app.config.ts).
- Add or replace public pages, public nav, app messages, public content, and manifest-registered example APIs under `apps/<app>/**`.
- Avoid editing `src/**`, `components/**`, or `app/**` unless you are intentionally changing the foundation for all downstream consumers.
