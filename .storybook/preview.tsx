import type { Preview } from '@storybook/react-vite';
import { UIProvider, type ThemePreference } from '../src';
import './storybook.css';

// Viewport presets: the phone, tablet and desktop sizes every component is checked at.
const viewports = {
  phone360: {
    name: 'Phone 360 × 800',
    styles: { width: '360px', height: '800px' },
    type: 'mobile',
  },
  phone390: {
    name: 'Phone 390 × 844',
    styles: { width: '390px', height: '844px' },
    type: 'mobile',
  },
  tablet: {
    name: 'Tablet 768 × 1024',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet',
  },
  tabletLandscape: {
    name: 'Tablet 1024 × 768',
    styles: { width: '1024px', height: '768px' },
    type: 'tablet',
  },
  desktop: {
    name: 'Desktop 1440 × 900',
    styles: { width: '1440px', height: '900px' },
    type: 'desktop',
  },
} as const;

const preview: Preview = {
  // `visual`: included in visual snapshots (stories opt out with '!visual'). Add `visual-page` to snapshot the whole
  // viewport instead of just the story, for overlays that render outside it (dialogs, menus).
  tags: ['autodocs', 'visual'],
  parameters: {
    // Every story must pass axe. A story documents any exception in its own a11y parameters.
    a11y: { test: 'error' },
    viewport: { options: viewports },
    controls: { matchers: { color: /(background|color)$/i } },
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'high-contrast', title: 'High contrast' },
          { value: 'system', title: 'System' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, { globals }) => (
      <UIProvider themePreference={globals.theme as ThemePreference}>
        <Story />
      </UIProvider>
    ),
  ],
};

export default preview;
