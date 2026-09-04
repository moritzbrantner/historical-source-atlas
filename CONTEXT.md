# Atlas Domain Context

## Current migration state

The production application still contains the v1 atlas model. Historical model v2 is being introduced alongside it under the evidence-first direction recorded in `DECISIONS.md` and GitHub PRD issue #4.

Do not treat v1 storage or route vocabulary as the target ontology.

## V2 terms

**Documentary Source**: An evidence-bearing documentary or material carrier, such as a manuscript, inscription, artifact, archive holding, or collection item.

**Source Part**: A physically or editorially identifiable part of a documentary source that can carry observations or evidence.

**Text Work**: An abstract textual work independent from any one physical witness.

**Text Witness**: A particular documentary witness of a text work.

**Text Edition**: A transcription, transliteration, normalized text, translation, commentary, or other editorial representation of a witness/work.

**Historical Entity**: A reconstructed historical referent such as a person, group, institution, place, event, polity, or historical object. Historical entities are not documentary sources or digital assets.

**Observation**: Evidence identified in or about a source before it is promoted into a historical assertion. Examples include a text span, inscription feature, catalog observation, or image annotation.

**Assertion**: A provenance-bearing historical claim connecting a subject and predicate to an object or value. Assertions can carry temporal qualification, certainty, and supporting or contradicting evidence.

**Provenance**: The trace from an assertion or observation back to the source, source part, text unit, asset, bibliographic reference, or editorial action that supports it.

**Historical Graph**: The assertion-backed network of historical entities and relationships. It is derived from evidence; it is not a generic graph API.

**Projection**: A deterministic read model derived from v2 domain data for a particular surface such as a map, timeline, source page, entity page, search index, or evidence review.

**Digital Asset**: A digital representation or processing artifact such as an image, PDF, IIIF manifest, scan, OCR result, or derivative. Assets are not historical entities.

## V1 compatibility terms

These names remain in production code during migration but are not the target v2 ontology.

**Atlas Taxonomy**: V1 display/grouping vocabulary used by existing routes and UI.

**Source Kind / RecordKind**: V1 source-card classification (`artifact`, `inscription`, `manuscript`, `text`, `collection`, `archive`).

**Entity Type / EntityType**: V1 structural union that currently mixes documentary, textual, historical, catalog, and asset concepts. New v2 code must not extend this union.

**Display Category**: Human-facing V1 category derived from `EntityType` and subtype fields.

**Evidence Layer**: Existing user-visible grouping of evidence overlays in text or image review. This UI concept may remain, but its data should eventually come from v2 projections.

**Entity Overlay**: Existing map layer showing published atlas entities for an active viewport/time range.

**Existence Window**: Existing timeline slider range used by entity-overlay filtering.

**Known Activity Interval**: Existing broad interval used to summarize when a person is known to have existed or been active. In v2, supporting date statements belong in assertions/projections rather than intrinsic person state.

**Attested Presence**: A person-place association grounded in evidence. In v2 this is represented through assertions and provenance.

**Undated Fallback**: Geometry or presence evidence shown without direct date proof, visibly marked as undated.

**Personal Tag**: A user-authored label on sources; not part of historical ontology or atlas taxonomy.

## Non-concepts

**Theme** and **topic** are not first-class historical-model concepts yet.

A generic symmetric RDF/OWL-style graph abstraction is intentionally not a v2 public concept. It may be investigated later only when concrete use-cases justify a broader interface.
