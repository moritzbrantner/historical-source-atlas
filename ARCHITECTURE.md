# ARCHITECTURE.md

## Canonical runtime

This repository ships a Next.js 16 App Router application at the repo root. `app/` is the only canonical runtime entrypoint for pages and route handlers, while `app.manifest.ts` describes the standalone repository metadata used by scaffold tooling.

## Canonical structure

```text
app.manifest.ts          Standalone repo/app metadata for scaffold tooling
app/                     Next.js App Router pages, layouts, route handlers
apps/showcase/           App-pack manifest, content, messages, examples, tests
components/              Shared app-facing React components
docs/                    Platform repo contributor documentation
emails/                  React Email source
i18n/                    Routing and navigation adapters
messages/                Foundation localization dictionaries
packages/
  app-pack/              Public app-pack contracts and route helpers
  app-pack-react/        Public React helpers exposed to app packs
src/
  admin/                 Admin page composition helpers
  analytics/             Analytics use-cases and adapters
  api/                   Cross-route security and API helpers
  app-config/            App-pack contracts and manifest loading
  auth/                  Auth and account lifecycle services
  content/               MDX/content indexing
  db/                    Database schema and client
  domain/                Business use-cases
  dynamic-db/            Admin data-studio helpers
  email/                 Outbound email delivery/templates
  foundation/            Shared platform features exposed to app packs
  navigation/            App navigation metadata
  observability/         Logging and health helpers
  site-config/           Site settings, flags, announcements, analytics config
```

## Runtime boundaries

- Route handlers and pages live in `app/**`.
- `app.manifest.ts` describes standalone repo metadata such as package identity, entry workspace, deployment runtime, and shared package dependencies.
- App-pack extension data lives behind `AppManifest` in `apps/**`.
- Domain rules live in `src/domain/**`.
- Database access lives in `src/db/**`.
- Cross-cutting HTTP protections live in `src/api/**`.
- Local workspace package public APIs are `@moritzbrantner/app-pack` and `@moritzbrantner/app-pack-react`.
- Shared runtime package public APIs come from npm, starting with `@moritzbrantner/ui` and `@moritzbrantner/ui/styles.css`.

## Import rules

- Use canonical aliases only: `@/src/*`, `@/components/*`, `@/lib/*`, `@/i18n/*`, `@/messages/*`, `@/emails/*`, `@/scripts/*`.
- Prefer components from `@moritzbrantner/ui` for shared UI surfaces and controls. Add local components only for app-specific behavior or composition that the package does not provide.
- Do not introduce `features/`, `stores/`, or `lib/services/` namespaces.
- `src/domain/**` must not import app or component layer modules directly.
- `src/db/**` stays infrastructure-only.
- Foundation-owned code must not import `apps/**` directly except through the manifest loader seam.

## Test and Story Placement

- Unit tests live beside the source they exercise as `*.unit.test.ts` or `*.unit.test.tsx`.
- Integration tests live beside the source or route boundary they exercise as `*.integration.test.ts` or `*.integration.test.tsx`.
- E2E tests live beside the page, component, or workflow entrypoint they exercise as `*.e2e.spec.ts`.
- Storybook stories live beside the component they document as `*.stories.tsx` or `*.stories.mdx`.

## Platform direction

- Keep the deployable Next.js app at the repo root for now.
- Keep `app.manifest.ts` as the standalone repo/app metadata contract.
- Treat `AppManifest` as the public app-pack extension seam in phase 1.
- Keep `packages/app-pack` and `packages/app-pack-react` local until cross-repo reuse is proven.
- Consume long-lived shared runtime code from published npm packages instead of keeping duplicate local workspace packages.
