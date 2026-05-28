# SCAFFOLD_ALIGNMENT.md

## Canonical source

The normative scaffold contract lives in `monorepo/SCAFFOLD_V2.md`.

## Repo role

`next-template` is the maintained standalone web scaffold in the `next-expo-electron` family.

## What is local vs shared

Local:

- Next.js App Router runtime
- auth, admin, content, and app-pack implementation seams
- repo-specific route structure, env surface, and deployment commands

Shared:

- scaffold contract from `monorepo`
- local GitHub Actions workflow conventions
- structural migrations from `@moritzbrantner/platform-upgrader`
- released packages from npm

## Update path

1. Land contract changes in `monorepo`.
2. Publish shared workflow or package changes when needed.
3. Apply structural changes with `bunx @moritzbrantner/platform-upgrader apply scaffold-v2`.
4. Adopt repo-local implementation updates through normal PRs on this repo.

## What must not drift

- root `app.manifest.ts`
- `.platform-upgrader.json`
- package registry auth for shared `@moritzbrantner/*` packages
- standalone repo semantics (`entryWorkspace: '.'`)
- shared package contract for `@moritzbrantner/ui`

## Config references

- `.platform-upgrader.json`
- `app.manifest.ts`
- `docs/updating-from-upstream.md`
