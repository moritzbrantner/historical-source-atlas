import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const teardownFile = fileURLToPath(import.meta.url);
const teardownDir = path.dirname(teardownFile);

export default async function globalTeardown() {
  if (process.env.E2E_SKIP_GLOBAL_TEARDOWN === 'true') {
    return;
  }

  execFileSync('./scripts/ci/bootstrap-e2e-db.sh', ['--teardown'], {
    cwd: path.resolve(teardownDir, '../..'),
    stdio: 'inherit',
  });
}
