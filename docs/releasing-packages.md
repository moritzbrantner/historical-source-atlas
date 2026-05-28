# Releasing Packages

This repository keeps only `packages/app-pack` and `packages/app-pack-react` as local packages.

## Local verification

```bash
bun run packages:lint
bun run packages:typecheck
bun run packages:build
bun run packages:test
```

## Publishing expectations

- Publish only from `packages/*`.
- Treat `@moritzbrantner/ui` as an external `platform-packages` dependency, not a local release target in this repo.
- Build before testing or publishing; package `exports` point at `dist/index.js` and `dist/index.d.ts`.
- Treat package `exports` as the supported public API surface.
- Do not commit tarballs, `.turbo` logs, or built `dist/` output back into the repo.
- Keep release notes focused on public entrypoint changes and breaking API shifts.
