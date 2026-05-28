#!/usr/bin/env bash
set -euo pipefail

./scripts/ci/tier-nightly.sh
bun run db:check
./scripts/ci/check-atlas-seed-idempotency.sh
bun run test:integration
