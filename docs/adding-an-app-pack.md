# Adding an App Pack

1. Create `apps/<name>/manifest.ts` that satisfies `AppManifest`.
2. Add app-pack messages under `apps/<name>/messages/<locale>`.
3. Add any MDX roots under `apps/<name>/content/<collection>/<locale>`.
4. Register example APIs through `AppManifest.exampleApis` when the app exposes `/api/examples/*` handlers.
5. Put pack-specific contract tests under `apps/<name>/tests`.
6. Point `app.config.ts` at the active manifest.

## Expectations

- Keep `AppManifest` shape stable unless the platform contract changes intentionally.
- Every public page namespace must exist for each supported locale.
- Every configured content root must exist, contain localized MDX for enabled locales, and be readable by the root app.
- Public pages and example APIs should be feature-gated with `FoundationFeatureKey` values when they are optional.
