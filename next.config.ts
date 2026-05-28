import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

import { getEnv } from './src/config/env';
import { normalizeRouterBasePath } from './src/runtime/base-path';

const allowedDevOrigins = [
  'http://127.0.0.1:3005',
  'http://localhost:3005',
  'http://127.0.0.1',
  'http://localhost',
  '127.0.0.1',
  'localhost',
] as const;

const env = getEnv();
const githubPagesBasePath = normalizeRouterBasePath(env.githubPagesBasePath);

function remoteImagePatterns() {
  const patterns: Array<{
    protocol: 'http' | 'https';
    hostname: string;
    port?: string;
  }> = env.images.remoteHosts.map((host) => {
    const [hostname, port] = host.split(':');

    return {
      protocol: 'https' as const,
      hostname,
      port,
    };
  });

  if (env.storage.publicBaseUrl) {
    const storageUrl = new URL(env.storage.publicBaseUrl);
    patterns.push({
      protocol: storageUrl.protocol.replace(':', '') as 'http' | 'https',
      hostname: storageUrl.hostname,
      port: storageUrl.port || undefined,
    });
  }

  return patterns;
}

function imageSourceOrigins() {
  const origins = env.images.remoteHosts.map((host) => `https://${host}`);

  if (env.storage.publicBaseUrl) {
    origins.push(new URL(env.storage.publicBaseUrl).origin);
  }

  return [...new Set(origins)];
}

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      ["img-src 'self' data: blob: https:", ...imageSourceOrigins()].join(' '),
      "font-src 'self' data:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https:",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const productionHeaders =
  env.isProduction && env.deploymentTarget !== 'gh-pages'
    ? async () => [
        {
          source: '/:path*',
          headers: securityHeaders,
        },
      ]
    : undefined;

export const normalNextConfig: NextConfig = {
  allowedDevOrigins: [...allowedDevOrigins],
  transpilePackages: ['@moritzbrantner/maps', '@moritzbrantner/ui'],
  images: {
    remotePatterns: remoteImagePatterns(),
  },
  headers: productionHeaders,
};

export const githubPagesNextConfig: NextConfig = {
  allowedDevOrigins: [...allowedDevOrigins],
  transpilePackages: ['@moritzbrantner/maps', '@moritzbrantner/ui'],
  assetPrefix: githubPagesBasePath === '/' ? undefined : githubPagesBasePath,
  basePath: githubPagesBasePath === '/' ? undefined : githubPagesBasePath,
  images: {
    remotePatterns: remoteImagePatterns(),
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
};

const nextConfig =
  env.deploymentTarget === 'gh-pages'
    ? githubPagesNextConfig
    : normalNextConfig;

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: ['rehype-slug'],
  },
});

export default withMDX({
  ...nextConfig,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
});
