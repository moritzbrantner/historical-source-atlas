# scaffold-v2 reconciliation audit

This audit classifies the current uncommitted work before contract alignment. Nothing in the dirty tree should be reverted by default.

## Reusable platform work to keep

- OAuth and social sign-in additions across `app/[locale]/(guest)/*`, `components/auth/*`, `components/profile-menu.tsx`, `src/auth.ts`, `src/auth/oauth/*`, and the matching integration/unit/component coverage.
- Settings and account-surface improvements that support reusable auth flows, including passwordless and account-contact updates in `app/[locale]/(protected)/settings/*`, `components/account-*.tsx`, and the matching tests.
- Notification and navigation hardening that stays generic to a scaffold baseline, including `components/notification*`, `components/notifications/*`, and `components/navigation-analytics-tracker.tsx`.
- Auth and settings copy updates in `messages/en/*` and `messages/de/*` that describe reusable login, registration, and settings behavior.

## Repo-local implementation detail to keep

- Showcase content refinements in `apps/showcase/pages/*` that demonstrate the app-pack seam without changing the public scaffold contract.
- Repo-local env wiring in `.env.example`, `.env.e2e.example`, and `scripts/e2e/environment.ts` as long as it continues to support the reusable auth baseline.

## Stale contract, docs, or tests to replace

- `docs/updating-from-upstream.md` because it still describes a subtree merge model that is out of contract for `scaffold-v2`.
- Any contract docs that imply `packages/ui` remains the long-term runtime source of truth after the platform-packages migration.
- Any tests that encode subtree-sync assumptions instead of package, workflow, or upgrader-based maintenance.
