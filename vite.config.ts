import { resolve } from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import type { BrowserCommand } from 'vitest/node';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// Never bundle dependencies or peers (or their subpath imports, e.g. react/jsx-runtime); the app installs them.
const externals = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)];
const isExternal = (id: string) => externals.some((dep) => id === dep || id.startsWith(`${dep}/`));

// Public entry points. More are added as components land.
const entries = {
  index: resolve(import.meta.dirname, 'src/index.ts'),
  'form/index': resolve(import.meta.dirname, 'src/form/index.ts'),
  'table/index': resolve(import.meta.dirname, 'src/table/index.ts'),
  'chart/index': resolve(import.meta.dirname, 'src/chart/index.ts'),
  'shell/index': resolve(import.meta.dirname, 'src/shell/index.ts'),
  'map/index': resolve(import.meta.dirname, 'src/map/index.ts'),
  'code/index': resolve(import.meta.dirname, 'src/code/index.ts'),
  'markdown/index': resolve(import.meta.dirname, 'src/markdown/index.ts'),
  'logs/index': resolve(import.meta.dirname, 'src/logs/index.ts'),
  'diff/index': resolve(import.meta.dirname, 'src/diff/index.ts'),
  'media/index': resolve(import.meta.dirname, 'src/media/index.ts'),
  'graph/index': resolve(import.meta.dirname, 'src/graph/index.ts'),
  'canvas/index': resolve(import.meta.dirname, 'src/canvas/index.ts'),
  'chat/index': resolve(import.meta.dirname, 'src/chat/index.ts'),
  'finance/index': resolve(import.meta.dirname, 'src/finance/index.ts'),
  'dicom/index': resolve(import.meta.dirname, 'src/dicom/index.ts'),
  '3d/index': resolve(import.meta.dirname, 'src/3d/index.ts'),
  'editor/index': resolve(import.meta.dirname, 'src/editor/index.ts'),
  'terminal/index': resolve(import.meta.dirname, 'src/terminal/index.ts'),
  'music/index': resolve(import.meta.dirname, 'src/music/index.ts'),
  'math/index': resolve(import.meta.dirname, 'src/math/index.ts'),
  'codes/index': resolve(import.meta.dirname, 'src/codes/index.ts'),
};

/**
 * PdfViewer finds pdf.js's worker with `new URL('pdfjs-dist/…', import.meta.url)`. Left alone, the library build
 * would inline the whole worker as a data URL; this keeps the expression as written in dist/, so the app's bundler
 * resolves the worker from its own pdfjs-dist.
 */
const keepPdfWorkerUrl: Plugin = {
  name: 'keep-pdf-worker-url',
  apply: 'build',
  enforce: 'pre',
  transform(code, id) {
    // Only a comment is inserted on the same line, so the existing source map stays right (`map: null`).
    return id.endsWith('/src/media/player/pdfjs.ts')
      ? {
          code: code.replace("new URL('pdfjs-dist/", "new URL(/* @vite-ignore */ 'pdfjs-dist/"),
          map: null,
        }
      : null;
  },
  renderChunk(code) {
    return code.includes('@vite-ignore')
      ? { code: code.replace(/\/\* @vite-ignore \*\/\s*/g, ''), map: null }
      : null;
  },
};

/** A real touch tap through Playwright, for interaction tests on the touch-enabled instances. */
const tap: BrowserCommand<[selector: string]> = async (context, selector) => {
  if (context.provider.name !== 'playwright') {
    throw new Error('The tap command needs the Playwright provider');
  }
  await context.iframe.locator(selector).tap();
};

/** Holds the mouse button down on the element for `ms` milliseconds, then releases it. */
const hold: BrowserCommand<[selector: string, ms: number]> = async (context, selector, ms) => {
  if (context.provider.name !== 'playwright') {
    throw new Error('The hold command needs the Playwright provider');
  }
  await context.iframe.locator(selector).hover();
  await context.page.mouse.down();
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
  await context.page.mouse.up();
};

// Browser tests run at phone, tablet and desktop sizes, with touch on phone and tablet.
const browserInstances = [
  { browser: 'chromium' as const, name: 'desktop', viewport: { width: 1440, height: 900 } },
  {
    browser: 'chromium' as const,
    name: 'tablet',
    viewport: { width: 768, height: 1024 },
    provider: playwright({ contextOptions: { hasTouch: true } }),
  },
  {
    browser: 'chromium' as const,
    name: 'phone',
    viewport: { width: 360, height: 800 },
    provider: playwright({ contextOptions: { hasTouch: true, isMobile: true } }),
  },
];

export default defineConfig({
  plugins: [react(), keepPdfWorkerUrl],
  // Pre-bundle these up front, so a fresh test run doesn't reload mid-test when Vite discovers them.
  optimizeDeps: {
    // MapLibre loads its worker from beside its own module file, so it's served from node_modules as it is.
    exclude: ['maplibre-gl'],
    include: [
      '@internationalized/date',
      'react-aria-components',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      '@tanstack/react-form',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'chart.js',
      'chartjs-plugin-zoom',
      'chartjs-adapter-luxon',
      'luxon',
      'pdfjs-dist',
      'hls.js',
      'three',
      'three/addons/controls/OrbitControls.js',
      'three/addons/loaders/STLLoader.js',
      'three/addons/loaders/OBJLoader.js',
      'three/addons/loaders/GLTFLoader.js',
      'lexical',
      '@lexical/code',
      '@lexical/html',
      '@lexical/link',
      '@lexical/list',
      '@lexical/markdown',
      '@lexical/rich-text',
      '@lexical/selection',
      '@lexical/table',
      '@lexical/utils',
      '@lexical/react/LexicalCheckListPlugin',
      '@lexical/react/LexicalComposer',
      '@lexical/react/LexicalComposerContext',
      '@lexical/react/LexicalContentEditable',
      '@lexical/react/LexicalErrorBoundary',
      '@lexical/react/LexicalHistoryPlugin',
      '@lexical/react/LexicalLinkPlugin',
      '@lexical/react/LexicalListPlugin',
      '@lexical/react/LexicalMarkdownShortcutPlugin',
      '@lexical/react/LexicalRichTextPlugin',
      '@lexical/react/LexicalTablePlugin',
      '@lexical/react/LexicalTypeaheadMenuPlugin',
      '@lexical/react/useLexicalNodeSelection',
      '@xterm/xterm',
      '@xterm/addon-fit',
      '@xterm/addon-search',
      'vexflow',
      'vexflow/bravura',
      'temml',
      'mathlive',
      'jsqr',
      '@zxing/library',
    ],
  },
  build: {
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rolldownOptions: {
      external: isExternal,
      output: {
        // One output file per module so consumers can tree-shake.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    // Unminified output is easier for consumers to debug; their bundler minifies.
    minify: false,
    sourcemap: true,
    emptyOutDir: false,
  },
  test: {
    // Every browser test runs in headless Chromium, which is heavy. Locally at most TEST_WORKERS (default 4) test files
    // run at once, and the unit and story groups run one after the other, so a full run doesn't starve the machine.
    // CI uses Vitest's default.
    maxWorkers: process.env.TEST_WORKERS ?? (process.env.CI ? undefined : 4),
    projects: [
      {
        extends: true,
        plugins: [tailwindcss()],
        test: {
          name: 'unit',
          sequence: { groupOrder: 0 },
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./test/setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: browserInstances,
            commands: { tap, hold },
          },
        },
      },
      // Every story renders and passes axe (parameters.a11y.test = 'error') in each theme.
      ...(['light', 'dark', 'high-contrast'] as const).map((theme) => ({
        extends: true,
        plugins: [
          tailwindcss(),
          storybookTest({
            configDir: resolve(import.meta.dirname, '.storybook'),
            initialGlobals: { theme },
          }),
        ],
        test: {
          name: `storybook-${theme}`,
          sequence: { groupOrder: 1 },
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' as const, name: `storybook-${theme}` }],
          },
        },
      })),
    ],
  },
});
