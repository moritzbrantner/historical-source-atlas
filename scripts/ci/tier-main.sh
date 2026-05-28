#!/usr/bin/env bash
set -euo pipefail

./scripts/ci/tier-beta.sh
bun run storybook:build
bun run test:storybook
bun run build:gh-pages
bun run build
./scripts/ci/run-e2e.sh
