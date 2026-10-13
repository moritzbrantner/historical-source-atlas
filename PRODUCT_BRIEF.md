# Historical Source Atlas — Product brief

## Purpose

Historical Source Atlas is a Next.js application for researching documentary sources, their locations and dates, references, and evidence for reconstructed historical context. Its value is source-centric exploration and traceable interpretation, **not** providing a reusable Next.js platform template.

## Audience and tasks

- Researchers locating manuscripts, inscriptions, artifacts, and textual sources in geographic and chronological context.
- Readers following source references, comparisons, transcriptions, and manuscript images.
- Curators investigating provenance, uncertainty, and contradictory historical claims about people, places, events, and objects.

## Current application

The shipped v1 atlas includes map/timeline browsing, filters, source and entity detail, related references, evidence review, collections, and personal tags. Next.js API repositories supply the full-stack build, while bundled static records support GitHub Pages.

The account, administration, content, localization, and showcase modules inherited from `next-template` are supporting infrastructure, not atlas product completion criteria.

## Target architecture

Historical model v2 separates documentary sources/parts, textual works/witnesses/editions, historical entities, observations/assertions/provenance, and digital assets. Historically contestable relationships preserve certainty, time, source support, and disagreement; deterministic projections feed UI and search.

V2 kernel, projections, and migration seam exist. UI cutover and v1 retirement remain incomplete. See [DEC-0004](DECISIONS.md), [CONTEXT.md](CONTEXT.md), and [PRD #4](https://github.com/moritzbrantner/historical-source-atlas/issues/4).

## Scope guardrails

Preserve v1 behavior during incremental migration; keep historical claims grounded in evidence; do not silently canonicalize conflicting assertions; and do not introduce a generic symmetric graph interface without a separate decision.
