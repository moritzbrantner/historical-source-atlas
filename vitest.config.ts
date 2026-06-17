import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@moritzbrantner/app-pack': path.resolve(
        __dirname,
        'packages/app-pack/src/index.ts',
      ),
      '@moritzbrantner/app-pack-react': path.resolve(
        __dirname,
        'packages/app-pack-react/src/index.tsx',
      ),
      '@': path.resolve(__dirname, '.'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(
        __dirname,
        'node_modules/react/jsx-runtime.js',
      ),
    },
  },
  test: {
    environment: 'node',
    include: [
      '**/*.unit.test.ts',
      '**/*.unit.test.tsx',
      '**/*.integration.test.ts',
      '**/*.integration.test.tsx',
    ],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
    ],
    setupFiles: ['./src/testing/vitest.setup.ts'],
  },
});
