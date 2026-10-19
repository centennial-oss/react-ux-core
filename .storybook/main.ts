import { defineMain } from '@storybook/react-vite/node';
import pkg from '../package.json' with { type: 'json' };

export default defineMain({
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // Files the stories load at run time, such as the demo flag images (public/images/flags).
  staticDirs: ['./public'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // No usage telemetry, in keeping with the project's privacy stance (PRIVACY.md).
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  // Components bring their own surfaces through the theme tokens; Storybook's backgrounds tool would fight them.
  // Storybook's onboarding checklist is for Storybook authors, not readers of the published docs.
  features: {
    backgrounds: false,
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
  // The version shown in the Storybook header. The release workflow sets
  // STORYBOOK_RELEASE_VERSION; local builds show the package.json version marked as a development build.
  env: (config) => ({
    ...config,
    STORYBOOK_RELEASE_VERSION: process.env.STORYBOOK_RELEASE_VERSION ?? `${pkg.version}-dev`,
  }),
  // Storybook reads vite.config.ts (plugins only); Tailwind is added here for stories.
  viteFinal: async (config) => {
    const { mergeConfig } = await import('vite');
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    return mergeConfig(config, { plugins: [tailwindcss()] });
  },
});
