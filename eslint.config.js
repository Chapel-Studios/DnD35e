// eslint.config.js
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import semistandard from 'eslint-config-semistandard';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';


export default [

  // Base config for all TS/JS/Vue files
  {
    files: ['**/*.{ts,mts,js,vue}'],

    ignores: [
      // Ignore build artifacts and dependencies
      'node_modules/',
      'dist/',
      'build/',
      'out/',
      'types/',

      // Ignore Foundry-generated files
      'packs/',
      'lang/',
      'templates/',

      // Allow source files (negated patterns)
      '!src/',
      '!scripts/',

      // Ignore declaration files
      '**/*.d.ts',
      '**/*.d.mts',
    ],

    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        game: 'readonly',
        canvas: 'readonly',
        ui: 'readonly',
        foundry: 'readonly',
        FormApplication: 'readonly',
        Application: 'readonly',
        Dialog: 'readonly',
        CONFIG: 'readonly',
        CONST: 'readonly',
        COMPENDIUM_METADATA: 'readonly',
        ChatMessage: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        Scene: 'readonly',
        Token: 'readonly',
        Wall: 'readonly',
        AmbientLight: 'readonly',
        Combatant: 'readonly',
        Combat: 'readonly',
        Note: 'readonly',
        Drawing: 'readonly',
        Tile: 'readonly',
        Measured: 'readonly',
        Macro: 'readonly',
        RollTable: 'readonly',
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      vue: vuePlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },

    // Flat config doesn't support "extends" the same way,
    // so we spread semistandard's rules manually.
    rules: {
      ...semistandard.rules,

      // Your custom rules
      semi: ['error', 'always'],
      'comma-dangle': ['error', {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'never',
      }],
      // 'trailingComma': 'all',
      indent: ['error', 2],
      quotes: ['error', 'single'],
      'object-curly-spacing': ['error', 'always'],
      'no-console': 'off',
      'no-unused-vars': 'off',

      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],

      'new-cap': ['error', { newIsCap: true, capIsNew: false }],
      'func-call-spacing': 'off',

      'vue/script-indent': ['error', 2, { baseIndent: 1 }],
      'vue/html-indent': ['error', 2, { baseIndent: 1 }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // Vue-specific override
  {
    files: ['**/*.vue'],
    rules: {
      indent: 'off',
    },
  },
];