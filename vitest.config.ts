import vue from '@vitejs/plugin-vue';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

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
      '@scene': path.resolve(__dirname, 'src/scene'),
      '@settings': path.resolve(__dirname, 'src/settings'),
      '@source': path.resolve(__dirname, 'src'),
      '@effects': path.resolve(__dirname, 'src/documents/activeEffects'),
    },
  },
  plugins: [
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
