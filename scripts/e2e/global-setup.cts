// scripts/e2e/global-setup.cts
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { applyE2EEnvironment } from './environment';

const setupFile = __filename;
const setupDir = path.dirname(setupFile);
const appRoot = path.resolve(setupDir, '../..');

function canInstallSystemDependencies() {
  try {
    execFileSync('sudo', ['-n', 'true'], {
      cwd: appRoot,
      stdio: 'ignore',
    });

    return true;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  applyE2EEnvironment();

  if (process.env.E2E_SKIP_GLOBAL_BOOTSTRAP !== 'true') {
    execFileSync('./scripts/ci/bootstrap-e2e-db.sh', [], {
      cwd: appRoot,
      stdio: 'inherit',
    });
  }

  if (process.env.E2E_SKIP_PLAYWRIGHT_INSTALL === 'true') {
    return;
  }

  const installArgs = ['x', 'playwright', 'install'];

  if (process.env.CI && canInstallSystemDependencies()) {
    installArgs.push('--with-deps');
  }

  installArgs.push('chrome');

  execFileSync('bun', installArgs, {
    cwd: appRoot,
    stdio: 'inherit',
  });
}
