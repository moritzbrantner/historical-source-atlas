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

## DEC-0004: Historical model v2 is source/evidence-first with first-class assertions

- **Date:** 2026-09-04
- **Status:** accepted

### Context

The v1 atlas model uses one broad entity vocabulary for documentary objects, textual structures, historical entities, catalog records, and digital assets. It also places historically contestable values such as dates, locations, and participation directly on entities even when those values depend on particular evidence.

### Decision

Introduce a v2 domain model alongside v1 with these separate conceptual areas:

- documentary sources and source parts;
- textual works, witnesses, editions, translations, and text units;
- historical entities such as people, groups, places, events, polities, and historical objects;
- evidence, provenance, observations, and first-class assertions;
- digital assets and derived processing artifacts.

Assertions carry subject, predicate, object or value, optional temporal qualification, optional certainty, provenance, and evidence references. Conflicting assertions remain valid data and are not collapsed by the domain kernel.

The primary dependency direction is:

`source -> observation/annotation -> assertion + provenance -> historical graph -> deterministic projection`

A fully symmetric general knowledge graph may be explored later, but it is explicitly outside the v2 interface until concrete use-cases justify it.

### Consequences

- Historical uncertainty and disagreement can be represented without mutating canonical entity properties.
- Map, timeline, search, source-detail, entity-detail, and evidence-review surfaces become deterministic projections rather than independent interpretations of storage rows.
- v1 remains operational during migration and is translated through explicit compatibility adapters.
- The v2 public interface stays narrow instead of becoming a speculative RDF/OWL-style graph API.

## DEC-0005: Adopt repository-foundation-v1 before the v2 domain rewrite

- **Date:** 2026-09-04
- **Status:** accepted

### Context

The atlas already contains agent-loop planning guidance, but it predates the current coding-tooling repository foundation and carries stale custom CI setup, including references to a sibling-install script that no longer exists.

### Decision

Adopt `.coding-tooling.json` with the `repository-foundation-v1` profile and use the shared coding-tooling validation workflow as the fast deterministic gate. Preserve atlas-specific integration, Storybook, Pages, database, production build, and E2E verification as repository-owned higher-cost checks.

The private-registry Renovate migration remains blocked until issue #3 proves hosted Renovate access; foundation adoption must not remove that guardrail.

### Consequences

- Fast validation emits the shared machine-readable report and execution receipt used by the coding-agent landscape.
- Repository-specific expensive checks remain local and can evolve independently.
- Tooling and domain migration are separated, reducing the risk that infrastructure failures are mistaken for ontology failures.
