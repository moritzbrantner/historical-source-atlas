# Historical Source Atlas — Migration notes

This is a history of the atlas and its platform inheritance, not a statement that v2 has fully replaced v1.

## Inherited platform history

The identical `next-template` migration note dated April 16, 2026 described its adoption of one Next.js App Router runtime, Bun workspaces, published `@moritzbrantner/ui`, a standalone `app.manifest.ts`, and the two local app-pack packages. This is **template-origin history**, not an atlas-specific historical-model migration. Preserve the corresponding existing platform decisions as [DEC-0001 to DEC-0003](DECISIONS.md); [DEC-0005](DECISIONS.md) records foundation tooling adoption.

The original Vite-based atlas moved into `src/atlas/` and the Next.js localized route tree. Atlas-specific SQL migrations and fixtures are under `db/atlas/`, with HTTP routes under `app/api/atlas/`. Root legacy source URLs redirect to the canonical localized routes.

## Evidence-first migration status

1. **V1 remains operational:** source cards, taxonomy, map/timeline, source/entity/evidence views and data contracts.
2. **V2 model exists:** documentary, textual, historical, evidence/provenance/assertion, and digital models in `src/atlas/domain/v2/`.
3. **Projections and migration seam exist:** deterministic projectors, strict v1 adapters, diagnostics, and `src/atlas/server/atlasV2MigrationRepository.ts`.
4. **Initial v2 API exists:** `/api/atlas/v2/sources/[slug]/projection`.
5. **UI cutover remains open:** [issue #12](https://github.com/moritzbrantner/historical-source-atlas/issues/12); do not remove v1 yet.
6. **V1 retirement remains open:** [issue #13](https://github.com/moritzbrantner/historical-source-atlas/issues/13), only after dependent consumers migrate.

[DEC-0004](DECISIONS.md), [CONTEXT.md](CONTEXT.md), [domain guidance](docs/agents/domain.md), and [PRD #4](https://github.com/moritzbrantner/historical-source-atlas/issues/4) define the intended v2 semantics. Never manufacture missing provenance from legacy data.

## Inherited profile-image history

The original platform guide described a transition from inline `User.image` data URLs to object-storage keys. The current inherited upload use case persists the object first, records its key, removes replaced objects, and cleans up failed uploads. No evidence here establishes that a historical image backfill ran in an atlas deployment. Retain data and verify actual records before any migration or rollback; see [production readiness](docs/production-readiness.md).

This documentation change performs **no runtime or database migration**.
