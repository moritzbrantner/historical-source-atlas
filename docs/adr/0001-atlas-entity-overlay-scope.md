# Atlas Entity Overlay Scope

Entity overlays derive only from published Atlas entities rather than an external historical gazetteer or broader world-history dataset. This keeps the feature aligned with the Atlas data model and avoids importing a separate data-governance problem before the project has ownership rules for it; missing cities, countries, or people are therefore treated as curation gaps in Atlas data, not as overlay query failures.
