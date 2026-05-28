import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function listTrackedExistingFiles(pathspec: string) {
  return execFileSync('git', ['ls-files', pathspec], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((filePath) => existsSync(path.join(process.cwd(), filePath)));
}

describe('workspace package cleanliness', () => {
  it('only tracks active workspace packages under packages/', () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as { workspaces: string[] };
    const activePackages = packageJson.workspaces.filter((workspace) =>
      workspace.startsWith('packages/'),
    );

    const trackedPackageManifests = readdirSync(
      path.join(process.cwd(), 'packages'),
      {
        withFileTypes: true,
      },
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => `packages/${entry.name}/package.json`)
      .filter((filePath) => existsSync(path.join(process.cwd(), filePath)));

    expect(trackedPackageManifests.sort()).toEqual(
      activePackages.map((workspace) => `${workspace}/package.json`).sort(),
    );
  });

  it('does not track stale vendored package artifacts', () => {
    const trackedFiles = listTrackedExistingFiles('packages');

    const forbiddenTrackedFiles = trackedFiles.filter((filePath) => {
      return (
        filePath.endsWith('.tgz') ||
        filePath.includes('/dist/') ||
        filePath.includes('/.turbo/')
      );
    });

    expect(forbiddenTrackedFiles).toEqual([]);
  });

  it('does not track local profile uploads or default Next starter images', () => {
    const trackedPublicFiles = listTrackedExistingFiles('public');

    const forbiddenPublicFiles = trackedPublicFiles.filter((filePath) => {
      return (
        filePath.startsWith('public/local-profile-images/') ||
        [
          'public/file.svg',
          'public/globe.svg',
          'public/next.svg',
          'public/vercel.svg',
          'public/window.svg',
        ].includes(filePath)
      );
    });

    expect(forbiddenPublicFiles).toEqual([]);
  });
});
