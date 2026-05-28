export const appManifest = {
  appId: 'web',
  slug: 'web',
  displayName: 'Web',
  platform: 'web',
  packageName: 'next-template',
  entryWorkspace: '.',
  releaseCadence: 'independent',
  sharedPackages: ['@moritzbrantner/ui'],
  featureFlags: ['auth', 'admin', 'uploads', 'app-pack'],
  deployment: {
    runtime: 'nextjs',
    output: '.next',
  },
} as const;
