import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APPROVED_PACKAGE_PREFIXES = [
  '@moritzbrantner/app-pack',
  '@moritzbrantner/app-pack-react',
  '@moritzbrantner/ui',
] as const;

function listEntrypointFiles() {
  const files: string[] = [];
  const appsRoot = path.resolve('apps');

  for (const appEntry of readdirSync(appsRoot, { withFileTypes: true })) {
    if (!appEntry.isDirectory()) {
      continue;
    }

    const appRoot = path.join(appsRoot, appEntry.name);
    const manifestPath = path.join(appRoot, 'manifest.ts');
    const messagesIndexPath = path.join(appRoot, 'messages', 'index.ts');

    files.push(
      path.relative(process.cwd(), manifestPath),
      path.relative(process.cwd(), messagesIndexPath),
    );
    walkColocatedTests(appRoot, files);
  }

  return files;
}

function walkColocatedTests(currentPath: string, files: string[]) {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      walkColocatedTests(entryPath, files);
      continue;
    }

    if (/\.unit\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(path.relative(process.cwd(), entryPath));
    }
  }
}

function readImports(filePath: string) {
  const source = readFileSync(filePath, 'utf8');
  return Array.from(
    source.matchAll(
      /(?:import|export)\s+(?:type\s+)?(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    ),
    (match) => match[1],
  );
}

describe('architecture: app-pack entrypoints', () => {
  it('keeps manifests, pack message loaders, and colocated pack tests on public exports', () => {
    const violations = listEntrypointFiles().flatMap((filePath) => {
      const currentApp = filePath.split(path.sep)[1];
      const selfAppPrefix = `@/apps/${currentApp}/`;

      return readImports(filePath)
        .flatMap((importPath) => {
          if (!importPath.startsWith('@/')) {
            return [];
          }

          if (importPath.startsWith(selfAppPrefix)) {
            return [];
          }

          return [`${filePath} -> ${importPath}`];
        })
        .filter(
          (violation) =>
            !APPROVED_PACKAGE_PREFIXES.some(
              (prefix) =>
                violation.endsWith(`-> ${prefix}`) ||
                violation.includes(`-> ${prefix}/`),
            ),
        );
    });

    expect(violations).toEqual([]);
  });
});
