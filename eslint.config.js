import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Files that run in Node rather than the browser.
const NODE_TS_FILES = [
  'vite.config.ts',
  'playwright.config.ts',
  '.storybook/main.ts',
  'test/visual/**/*.ts',
];

// Library source, excluding stories and tests. The convention rules below apply only here.
const LIBRARY_FILES = ['src/**/*.{ts,tsx}'];
const NON_LIBRARY_FILES = [
  'src/**/*.stories.tsx',
  'src/**/*.test.{ts,tsx}',
  'src/**/*.test-d.{ts,tsx}',
];

// Components use semantic tokens only, never Tailwind's raw palette.
const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white';
const COLOR_UTILITIES =
  'bg|text|border|border-[trblxyse]|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow|inset-shadow|drop-shadow';
const RAW_PALETTE_CLASS = `(^|[\\s:])(${COLOR_UTILITIES})-(${PALETTE})(-\\d{2,3})?([\\s/]|$)`;
const RAW_PALETTE_MESSAGE =
  'Use semantic colour tokens (bg-surface-1, text-fg-muted, bg-danger-solid…), not raw palette colours.';

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'storybook-static',
    'test-results',
    'playwright-report',
    '!.storybook',
  ]),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use useId for ids.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['forwardRef'],
              message: 'React 19 passes ref as a regular prop; forwardRef is not needed.',
            },
          ],
        },
      ],
    },
  },

  {
    files: NODE_TS_FILES,
    languageOptions: {
      globals: globals.node,
      parserOptions: { project: ['./tsconfig.node.json'] },
    },
  },

  {
    files: ['**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
  },

  {
    files: LIBRARY_FILES,
    ignores: NON_LIBRARY_FILES,
    rules: {
      // No timers for layout, theme or position. Behavioural timers go through src/utils/timers.ts.
      'no-restricted-globals': [
        'error',
        { name: 'setInterval', message: 'No setInterval; use observers or listeners instead.' },
        {
          name: 'setTimeout',
          message:
            'No setTimeout for layout, theme or position. Behavioural timers use src/utils/timers.ts.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${RAW_PALETTE_CLASS}/]`,
          message: RAW_PALETTE_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${RAW_PALETTE_CLASS}/]`,
          message: RAW_PALETTE_MESSAGE,
        },
        {
          selector: 'JSXText[value=/[A-Za-z]/]',
          message: 'No hard-coded user-facing text; use the messages object.',
        },
        {
          selector:
            // Only text with letters: an empty `alt=""` marks a decorative image and isn't user-facing text.
            'JSXAttribute[name.name=/^(aria-label|aria-description|aria-roledescription|aria-valuetext|title|placeholder|alt)$/] > Literal[value=/[A-Za-z]/]',
          message: 'No hard-coded user-facing text; use the messages object.',
        },
        {
          selector: 'JSXAttribute[name.name="style"]',
          message:
            'No style objects in library code except dynamic geometry; justify any exception with an eslint-disable comment.',
        },
      ],
      // Booleans are isX / hasX, matching React Aria (which also uses allowsX, shouldX, and defaultX for uncontrolled
      // initial values such as defaultOpen); canX is allowed for capability flags such as a step's canAdvance.
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeProperty',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'has', 'allows', 'should', 'default', 'can'],
          filter: { regex: '^(aria|data)-', match: false },
        },
      ],
    },
  },

  {
    files: ['src/utils/timers.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },

  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  storybook.configs['flat/recommended'],
]);
