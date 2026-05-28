# Platform Layout

This repository is a platform scaffold with one deployable Next.js app at the root, one current app pack in `apps/showcase`, standalone repo metadata in `app.manifest.ts`, and a narrow set of local app-pack workspaces in `packages/*`.

## Layers

- `app.manifest.ts` owns standalone repo/app metadata for cross-repo tooling.
- `app/` owns the runtime entrypoints.
- `src/` owns foundation, domain, and infrastructure code.
- `apps/*` own app-pack manifests, content, messages, and pack-specific tests.
- `packages/*` own the local app-pack seam only.

## Stable seams

- `app.manifest.ts` is the standalone repo metadata contract.
- App packs extend the platform through `AppManifest`.
- Local workspace packages expose stable entrypoints only from `package.json#exports`.
- Shared runtime packages come from `platform-packages`.
- Foundation code must not import app packs directly except via manifest loading.
