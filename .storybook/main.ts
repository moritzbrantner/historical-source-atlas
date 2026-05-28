import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  stories: ['../src/atlas/**/*.stories.@(ts|tsx|mdx)'],
};

export default config;
