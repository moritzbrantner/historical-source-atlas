# Atlas Domain Guidance

This repository is the canonical application for exploring historical sources and the historical claims reconstructed from them.

## Before Exploring

Read these in order when the task touches atlas behavior or modelling:

1. `CONTEXT.md` for stable project vocabulary.
2. `DECISIONS.md` for accepted architectural decisions.
3. GitHub PRD issue #4 for the evidence-first v2 migration horizon.
4. Nearby domain tests and projection tests for executable behavior.

Do not infer a new ontology from UI route names or database table names when those conflict with the accepted domain direction.

## Evidence-first v2 direction

The v2 model is **source/evidence-first**.

- Documentary sources and their parts are observations/evidence-bearing objects.
- Textual structures such as works, witnesses, editions, translations, and text units are separate from historical entities.
- Historical entities include people, groups/institutions, places, events, polities, and historical objects.
- Digital assets such as images, PDFs, IIIF manifests, OCR output, and derivatives are representations or processing artifacts, not historical entities.
- Historical knowledge is expressed through first-class assertions with provenance instead of being forced into intrinsic canonical properties.

A fully symmetric general knowledge graph may be explored later, but it must not widen the v2 public interface or delay the evidence-first migration.

## Assertion invariants

An assertion must be able to retain:

- a subject;
- a predicate;
- an object or literal value;
- temporal qualification when applicable;
- certainty or qualification when applicable;
- provenance;
- supporting or contradicting evidence references.

Conflicting assertions are valid domain data. Do not silently collapse them into one canonical fact in the kernel.

Dates, locations, participation, identity, authorship, and similar historically contestable statements should be modelled as assertions when their truth depends on evidence. Read models may expose a selected or summarized value, but that choice belongs in a deterministic projection with an explicit policy.

## Architectural flow

Use this dependency direction:

`source -> observation/annotation -> assertion + provenance -> historical graph -> deterministic projection`

Initial projections include:

- source detail;
- historical-entity detail;
- map features;
- timeline entries;
- search documents/results;
- evidence-review views.

UI code consumes projection/read-model interfaces. It must not depend directly on storage rows or reconstruct historical truth ad hoc.

## Migration boundary

The existing `EntityType`, `RecordKind`, taxonomy helpers, repositories, routes, and storage remain v1 compatibility surfaces until their consumers migrate.

When adding v2:

- add new domain modules beside v1 rather than mutating v1 types into hybrid forms;
- keep adapters at the migration seam;
- keep v1 vocabulary out of the v2 public interface unless a compatibility adapter explicitly translates it;
- make identity, ordering, and projection behavior deterministic and testable through stable interfaces;
- remove v1 concepts only after all production consumers have moved to v2 projections.

## Engineering boundaries

Prefer deep modules with small interfaces. Place seams where behavior actually varies, especially provenance resolution, projection policy, persistence, and external identifiers. Avoid pass-through abstractions and speculative generic graph APIs.

If a modelling decision would violate the boundaries above, update the accepted decision/PRD explicitly before implementing it rather than hiding the exception in a local type or adapter.
