import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(
  process.cwd(),
  'scripts/ci/resolve-e2e-base-url.mjs',
);
const servers: net.Server[] = [];

function listen(port = 0) {
  return new Promise<{ server: net.Server; port: number }>(
    (resolve, reject) => {
      const server = net.createServer();

      server.once('error', reject);
      server.once('listening', () => {
        const address = server.address();

        if (!address || typeof address === 'string') {
          reject(new Error('Expected an IPv4 listener address.'));
          return;
        }

        servers.push(server);
        resolve({ server, port: address.port });
      });

      server.listen(port, '127.0.0.1');
    },
  );
}

describe('resolve-e2e-base-url.mjs', () => {
  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => {
              if (error) reject(error);
              else resolve();
            });
          }),
      ),
    );
  });

  it('fails when an explicit local E2E_BASE_URL port is unavailable', async () => {
    const { port } = await listen();
    const result = spawnSync('node', [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        E2E_BASE_URL: `http://127.0.0.1:${port}`,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `E2E app port ${port} on 127.0.0.1 is unavailable`,
    );
  });

  it('chooses a free port when the default local e2e port is unavailable', async () => {
    const { port } = await listen();
    const result = spawnSync('node', [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        E2E_BASE_URL: undefined,
        E2E_DEFAULT_BASE_URL: `http://127.0.0.1:${port}`,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain(
      `E2E default port ${port} on 127.0.0.1 is unavailable`,
    );

    const resolvedUrl = new URL(result.stdout.trim());
    expect(resolvedUrl.hostname).toBe('127.0.0.1');
    expect(resolvedUrl.port).not.toBe(String(port));
  });
});
