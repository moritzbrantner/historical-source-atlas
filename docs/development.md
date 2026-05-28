# Development Workflow

## Setup

Install Bun `1.3.14`, then install dependencies:

```bash
./scripts/ci/install-with-sibling-maps.sh
```

The install helper first installs the sibling `../maps` checkout, then installs
this repository. That is required while the app depends on
`@moritzbrantner/maps`, `@moritzbrantner/data-density`, and
`@moritzbrantner/timeline-editor` through `file:../maps` paths.

Create local environment files from the examples:

```bash
cp .env.example .env
```

At minimum, set `AUTH_SECRET`, `SITE_URL` or `AUTH_URL`, and `DATABASE_URL` for long-lived database flows. Set `INTERNAL_CRON_SECRET` when testing internal cron endpoints.

## Daily Development

For the default local app with an ephemeral test database:

```bash
bun run dev
```

For long-lived local services:

```bash
docker compose up -d postgres mailpit minio minio-create-bucket
bun run db:migrate
bun run db:schema:generate
bun run db:seed:test-users
bun run dev:app
```

Run the background job worker separately when testing queued email or announcement jobs:

```bash
bun run jobs:work
```

## Standard Checks

```bash
bun run test
bun run format:check
bun run lint
bun run storybook:build
bun run test:storybook
bun run build
bun run build:gh-pages
bun run verify
```

- `bun run test`: fastest meaningful test pass, currently unit tests.
- `bun run format:check`: non-mutating `oxfmt` check.
- `bun run lint`: existing project lint command, also `oxfmt --check .`.
- `bun run storybook:build`: static Storybook build for atlas UI stories.
- `bun run test:storybook`: Storybook Vitest browser smoke and interaction tests.
- `bun run build`: package build plus production Next build.
- `bun run build:gh-pages`: static GitHub Pages export plus Unlighthouse report.
- `bun run verify`: hygiene report plus the full `checks:main` confidence path.

CI tiers are also available directly:

```bash
bun run checks:nightly
bun run checks:beta
bun run checks:main
```

`checks:main` includes e2e setup and Playwright tests, so expect it to be slower and to require Docker-compatible local services.

The CI tiers are release gates:

- `checks:nightly`: formatter, app/package typecheck, package tests, and unit tests.
- `checks:beta`: nightly checks plus Drizzle migration check, atlas seed idempotency, and integration tests.
- `checks:main`: beta checks plus Storybook build/tests, GitHub Pages export, production build, and e2e.

GitHub Pages builds set `NEXT_PUBLIC_ATLAS_DATA_MODE=static` so atlas pages read
bundled static source data instead of `/api/atlas/*` routes, which are not
available in static export output.

## Repo Hygiene

Run the lightweight hygiene report before handing off a branch:

```bash
bun run hygiene
```

It reports dirty status, untracked files, upstream/ahead/behind state, tracked generated directories, generated directories that are present but unignored, and local-only ignore coverage.

Generated and local-only paths should stay out of commits: `.next/`, `out/`, `dist/`, `packages/*/dist/`, `coverage/`, `test-results/`, `playwright-report/`, `.generated/`, `public/local-profile-images/`, `.env*`, and `*.tsbuildinfo`.

## Release Notes

There is no safe root release command. The repository has two local packages, `packages/app-pack` and `packages/app-pack-react`; package release expectations are documented in `docs/releasing-packages.md`.

Before publishing a package, run:

```bash
bun run packages:lint
bun run packages:typecheck
bun run packages:build
bun run packages:test
```

Publish only from the package directory and do not commit built `dist/` output or tarballs.

## Troubleshooting

- Shared runtime packages resolve from the public npm registry; no root `.npmrc` is required for them.
- E2E commands use `.env.example` plus test overrides and compose-backed services. Use `bun run test:e2e:setup` and `bun run test:e2e:teardown` when debugging setup separately.
- Prefer `bun run test:with-services` or `./scripts/ci/run-e2e.sh` for Docker-backed e2e so bootstrap and cleanup traps run consistently.
- If `next-env.d.ts`, `db-schema.json`, Drizzle snapshots, or lockfiles change, confirm they came from the normal generator or package-manager command before committing.

## Stable Release Checklist

- Fresh clone with sibling `maps` checkout installs via `./scripts/ci/install-with-sibling-maps.sh`.
- `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- `./scripts/ci/check-atlas-seed-idempotency.sh` passes.
- `bun run storybook:build` and `bun run test:storybook` pass.
- `bun run build` and `bun run build:gh-pages` pass.
- `bun run test:e2e` passes from a reused or freshly bootstrapped Docker environment.
- `bun run verify` passes.
- `git status --short` contains only intentional tracked changes.
- `bun run services:ps` is checked before handoff, and services started only for verification are stopped.
