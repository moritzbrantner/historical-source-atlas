import net from 'node:net';

const DEFAULT_BASE_URL =
  process.env.E2E_DEFAULT_BASE_URL ?? 'http://127.0.0.1:3006';
const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

function normalizeLocalHost(hostname) {
  return hostname === 'localhost' ? '127.0.0.1' : hostname;
}

function getPort(url) {
  return Number(url.port || (url.protocol === 'https:' ? 443 : 80));
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      resolve({ ok: false, error });
    });

    server.once('listening', () => {
      server.close(() => resolve({ ok: true }));
    });

    server.listen(port, host);
  });
}

function reserveEphemeralPort(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.once('listening', () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Unable to resolve an ephemeral e2e port.'));
          return;
        }

        resolve(address.port);
      });
    });

    server.listen(0, host);
  });
}

const explicitBaseUrl = process.env.E2E_BASE_URL;
const baseUrl = explicitBaseUrl ?? DEFAULT_BASE_URL;
const url = new URL(baseUrl);

if (!LOCAL_HOSTS.has(url.hostname)) {
  console.log(baseUrl);
  process.exit(0);
}

const host = normalizeLocalHost(url.hostname);
const port = getPort(url);
const availability = await canListen(port, host);

if (availability.ok) {
  console.log(baseUrl);
  process.exit(0);
}

if (explicitBaseUrl) {
  console.error(
    `E2E app port ${port} on ${host} is unavailable: ${availability.error.message}`,
  );
  console.error(
    'Stop the existing process or set E2E_BASE_URL to a free local port.',
  );
  process.exit(1);
}

const fallbackPort = await reserveEphemeralPort(host);
url.hostname = host;
url.port = String(fallbackPort);
console.error(
  `E2E default port ${port} on ${host} is unavailable; using ${url.toString()} instead.`,
);
console.log(url.toString());
