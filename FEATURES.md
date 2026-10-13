# Historical Source Atlas — Feature inventory

This inventories the **atlas product**, not the inherited Next.js scaffold. Status is grounded in existing source and tests.

## Available — v1 atlas UI

- **Source browsing:** map, timeline, filters, and source list under `src/atlas/features/atlas/` and `app/[locale]/atlas/`.
- **Source research:** details, locations, comparisons, related sources, and reference networks in `src/atlas/features/source-detail/`.
- **Historical-entity context:** entity pages, mentions, relations, and map overlays in `src/atlas/features/entity-detail/` and `src/atlas/entities/entity-overlay/`.
- **Evidence review:** text and manuscript-image views with selectable evidence layers in `src/atlas/features/evidence-review/`.
- **Personal organization:** source collections and tags in `src/atlas/entities/collections/` and `src/atlas/entities/source-tags/`.
- **Delivery:** Next.js HTTP/DB source repositories and bundled static-data mode for GitHub Pages.

These screens retain **v1 compatibility vocabulary**, not a completed evidence-first UI.

## Implemented foundations — v2, not fully integrated

- `src/atlas/domain/v2/`: domain kernel, explicit provenance, qualified assertions, and conflicting evidence.
- `src/atlas/domain/v2/projections/`: deterministic source/entity, map, timeline, search, and evidence-review projectors.
- `src/atlas/migration/`: v1-to-v2 compatibility adapters with diagnostics.
- `app/api/atlas/v2/sources/[slug]/projection/route.ts`: initial database-backed source projection endpoint.

## Open migration work

- Switch UI surfaces to v2 projections incrementally ([issue #12](https://github.com/moritzbrantner/historical-source-atlas/issues/12)).
- Retire overloaded v1 model only after consumers move ([issue #13](https://github.com/moritzbrantner/historical-source-atlas/issues/13)).
- General-purpose symmetric historical graph remains deferred by [DEC-0004](DECISIONS.md).

## Supporting platform features

Authentication, profiles, administration, localization, notifications, and `apps/showcase` examples exist in the inherited Next.js foundation. They are **not** atlas product features to count as domain implementation progress. See [architecture](ARCHITECTURE.md) and [platform layout](docs/platform-layout.md).
