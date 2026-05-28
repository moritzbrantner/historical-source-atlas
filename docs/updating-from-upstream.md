# Updating the Scaffold

This repo no longer assumes subtree sync or upstream folder merges.

## Update order

1. Adopt released runtime package updates from `platform-packages`, starting with `@moritzbrantner/ui`.
2. Adopt pinned reusable workflow updates when the shared workflow repo publishes a newer ref.
3. Apply structural repo migrations through `@moritzbrantner/platform-upgrader`.
4. Re-run `bun run typecheck` and the relevant test suites after each contract change.

## What to review

- `app.manifest.ts` for standalone repo metadata changes.
- `app.config.ts` and `apps/<app>/manifest.ts` for internal `AppManifest` feature changes.
- `docs/releasing-packages.md` when the local app-pack packages change.
- CI refs and upgrader config when workflow or scaffold migrations land.

## Recommended checks

- Confirm `app.config.ts` still points at the intended app pack.
- Review `apps/<app>/manifest.ts` for new feature keys or contract changes.
- Review `app.manifest.ts` for package, deployment, or shared-package changes.
- Run `bun run typecheck`.
- Run the unit and integration tests that cover manifest routing and feature gates.
