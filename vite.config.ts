import { defineConfig, Plugin } from 'vite';
import tsconfigPaths, { PluginOptions } from 'vite-tsconfig-paths';
import path from 'path';
import fg from 'fast-glob';
import fs from 'fs-extra';
import vue from "@vitejs/plugin-vue";

// Copy Foundry system + static files
function copyStaticFiles(opts?: PluginOptions | undefined): Plugin {
  return {
    name: 'copy-static-files',
    apply: 'build',
    async closeBundle() {
      const staticFiles = [
        'system.json',
        'README.md',
      ];
      for (const file of staticFiles) {
        await fs.copy(file, `dist/${file}`);
      }
    }
  };
}

// Copy .hbs templates into dist/hbsTemplates
function copyHbsFiles(opts?: PluginOptions | undefined): Plugin {
  return {
    name: 'copy-hbs-files',
    apply: 'build',
    async closeBundle() {
      const files = await fg('src/**/*.hbs');
      for (const file of files) {
        const rel = path.relative('src', file);
        const dest = path.join('dist/hbsTemplates', rel);
        await fs.ensureDir(path.dirname(dest));
        await fs.copy(file, dest);
      }
    }
  };
}

function logBuildTimestamp(opts?: PluginOptions | undefined): Plugin {
  return {
    name: 'log-build-timestamp',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      console.log(`Finished at ${new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })}`);
    },
  };
}

// Glob lang files
function bundleLangFiles() {
  return {
    name: 'bundle-lang-files',
    async closeBundle() {
      const srcRoot = path.resolve(__dirname, 'src/lang');
      const distRoot = path.resolve(__dirname, 'dist/lang');

      // Find all language directories
      const langDirs = await fs.readdir(srcRoot);

      for (const langCode of langDirs) {
        const langPath = path.join(srcRoot, langCode);
        const stat = await fs.stat(langPath);
        if (!stat.isDirectory()) continue;

        // Find all JSON files in this language folder (recursive)
        const files = await fg('**/*.json', { cwd: langPath, absolute: true });

        let merged: Record<string, string> = {};

        for (const file of files) {
          const json = await fs.readJSON(file);
          merged = { ...merged, ...json };
        }

        // Ensure dist/lang exists
        await fs.ensureDir(distRoot);

        // Write merged file
        const outFile = path.join(distRoot, `${langCode}.json`);
        await fs.writeJSON(outFile, merged, { spaces: 2 });

        console.log(`✅ Bundled ${files.length} files into ${outFile}`);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@vc": path.resolve(__dirname, "src/vue"),
      "@canvas": path.resolve(__dirname, "src/canvas"),
      "@constants": path.resolve(__dirname, "src/constants"),
      "@helpers": path.resolve(__dirname, "src/helpers"),
      "@items": path.resolve(__dirname, "src/entities/items"),
      "@actors": path.resolve(__dirname, "src/entities/actors"),
      "@entities": path.resolve(__dirname, "src/entities"),
      "@scene": path.resolve(__dirname, "src/scene"),
      "@source": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    tsconfigPaths(),
    copyStaticFiles(),
    copyHbsFiles(),
    bundleLangFiles(),
    vue(),
    logBuildTimestamp(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: mode === 'production',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main.mts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Strip "src/" from TS output
          return chunkInfo.name.replace(/^src[\\/]/, '') + '.mjs';
        },
        chunkFileNames: (chunkInfo) => {
          return chunkInfo.name.replace(/^src[\\/]/, '') + '.mjs';
        },
        assetFileNames: (assetInfo) => {
          const normalized = assetInfo.names[0]?.replace(/\\/g, '/');
          if (!normalized) return '[name][extname]';

          // // CSS bundle
          // if (normalized.endsWith('.css')) {
          //   return 'core[extname]';
          // }

          // Default: strip src/ if present
          if (normalized.startsWith('src/')) {
            return normalized.slice('src/'.length);
          }

          return '[name][extname]';
        }
      }
    },
    watch: {
      clearScreen: false,
    },
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        // // Glob all SCSS into one bundle
        // additionalData: () => {
        //   const files = fg.sync('src/**/*.scss');
        //   return files.map(f => `@import "${f.replace(/\\/g, '/')}";`).join('\n');
        // }
      }
    }
  }
}));
