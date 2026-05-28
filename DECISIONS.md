# DECISIONS.md

## DEC-0001: Next.js App Router is the canonical application runtime

- **Date:** 2026-04-16
- **Status:** accepted

### Context

The repository runtime is already Next.js App Router, but major docs and decisions still described an older starter runtime. That mismatch made the platform shape harder to reason about than the code itself.

### Decision

Standardize the repository on Next.js 16 App Router, Bun, and Drizzle. Documentation, CI, and contributor guidance must all reflect that runtime.

### Consequences

- Positive:
  - One runtime model for docs, tests, and generated output
  - No ambiguity around route structure, build tooling, or deployment behavior
- Trade-offs:
  - Stale TanStack-era references are intentionally removed

## DEC-0002: `src/` is the canonical application namespace and `AppManifest` is the app-pack seam

- **Date:** 2026-04-16
- **Status:** accepted

### Context

The repository already exposes app-pack behavior through `AppManifest`, while older docs still implied alternate route trees and parallel namespace roots.

### Decision

Keep `src/` as the sole canonical application namespace for the root app and keep `AppManifest` as the phase-1 extension seam for app packs.

### Consequences

- Positive:
  - New contributors only learn one runtime architecture and one extension seam
  - Foundation code and app-pack code have a clearer contract boundary
- Trade-offs:
  - The manifest shape stays conservative in phase 1 instead of being redesigned immediately

## DEC-0003: Local app-pack packages stay in-repo while shared runtime packages move to npm

- **Date:** 2026-04-18
- **Status:** accepted

### Context

The repository needs two different contracts: a standalone repo/app manifest for cross-repo tooling, and an internal `AppManifest` seam for app-pack behavior. It also needs to stop treating `ui` as a local runtime workspace now that the package is a published shared runtime dependency.

### Decision

Keep `packages/app-pack` and `packages/app-pack-react` local, add a root `app.manifest.ts` for standalone repo metadata, and consume `@moritzbrantner/ui` from npm.

### Consequences

- Positive:
  - The repo-level scaffold contract is separate from the app-pack routing contract
  - Shared runtime dependencies now converge with the rest of the maintained template family
- Trade-offs:
  - Only the app-pack seam remains locally releasable from this repo
