import vue from '@vitejs/plugin-vue';
import path from 'path';
import type { Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// The project convention is to write `import ... from './foo.mjs'` and let Vite/TypeScript
// resolve the `.mts` source file at build time (moduleResolution: "bundler"). However,
// `@vue/compiler-sfc` resolves type imports for `defineProps<T>` using its own internal
// resolver that does NOT follow Vite's .mjs→.mts mapping. This pre-transform plugin rewrites
// `import type ... from '*.mjs'` to `*.mts` inside Vue files before the SFC compiler ever
// sees them, so the compiler uses its normal TypeScript resolution path (which does handle
// tsconfig path aliases, transitive imports, etc.). Source files are never changed.
function mtsTypeImportFixer(): Plugin {
  return {
    name: 'mts-type-import-fixer',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('.vue')) return null;
      const transformed = code.replace(
        /\bimport\s+type\s+([^;]+?)\s+from\s+'(\.[^']+)\.mjs'/g,
        'import type $1 from \'$2.mts\''
      );
      return transformed !== code ? { code: transformed } : null;
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@vueApps': path.resolve(__dirname, 'src/vue/apps'),
      '@vueStores': path.resolve(__dirname, 'src/vue/stores'),
      '@vc': path.resolve(__dirname, 'src/vue/components'),
      '@canvas': path.resolve(__dirname, 'src/canvas'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@fields': path.resolve(__dirname, 'src/fields'),
      '@helpers': path.resolve(__dirname, 'src/helpers'),
      '@items': path.resolve(__dirname, 'src/documents/items'),
      '@actors': path.resolve(__dirname, 'src/documents/actors'),
      '@documents': path.resolve(__dirname, 'src/documents'),
      '@scene': path.resolve(__dirname, 'src/documents/scene'),
      '@settings': path.resolve(__dirname, 'src/settings'),
      '@source': path.resolve(__dirname, 'src'),
      '@effects': path.resolve(__dirname, 'src/documents/activeEffects'),
    },
  },
  plugins: [
    mtsTypeImportFixer(),
    tsconfigPaths(),
    vue(),
  ],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.mts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['tests/setup.mts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.mts', 'src/**/*.vue'],
      exclude: [
        'src/**/*.test.mts',
        'src/**/index.mts',
        'src/global.mts',
        'src/main.mts',
      ],
    },
  },
});
