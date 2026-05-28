# PLANS.md

## Current objective

Ship a consistent Next.js App Router platform scaffold where the documentation, package topology, CI, repo manifest, and app-pack contracts all agree on one canonical architecture.

## Active milestone: scaffold-v2 alignment

- Keep `app.manifest.ts` aligned with the standalone scaffold contract.
- Keep registered showcase routes, messages, content roots, and example APIs covered by contract tests.
- Keep local app-pack package exports aligned with built `dist` artifacts.

## Follow-up milestone: service-module ergonomics

- Continue decomposing oversized domain modules behind stable public imports.
- Reassess a future `apps/web` relocation only after package boundaries remain stable.

## Risks

- App-pack drift if manifest changes land without contract tests
- Workspace package drift if public entrypoints change without verification
- Large service modules still need ongoing decomposition without changing public imports.
