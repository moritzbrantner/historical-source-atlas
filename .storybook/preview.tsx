import type { Preview } from '@storybook/nextjs-vite';

import '../app/globals.css';

import { AtlasProviders } from '../src/atlas/app/AtlasProviders';

const preview: Preview = {
  decorators: [
    (Story) => (
      <AtlasProviders>
        <Story />
      </AtlasProviders>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'atlas',
      values: [
        {
          name: 'atlas',
          value: '#f1f5f9',
        },
        {
          name: 'white',
          value: '#ffffff',
        },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  tags: ['autodocs'],
};

export default preview;
