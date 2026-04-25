import vue from '@vitejs/plugin-vue';
import deepmerge from 'deepmerge';
import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Read local developer config (git-ignored) for per-machine paths
const localConfigPath = path.resolve(__dirname, 'local.config.json');
let localConfig: { foundrySystemDir?: string } = {};
if (fs.existsSync(localConfigPath)) {
  try {
    localConfig = fs.readJsonSync(localConfigPath);
  } catch {
    throw new Error(
      'Failed to read local.config.json — ensure it contains valid JSON.\n' +
      'See local.config.json.example for the expected shape.'
    );
  }
}
// Normalize: strip trailing /dnd35e if the developer included it
let foundrySystemDir = localConfig.foundrySystemDir;
if (foundrySystemDir && path.basename(foundrySystemDir) === 'dnd35e') {
  foundrySystemDir = path.dirname(foundrySystemDir);
}
const buildOutDir = foundrySystemDir ? path.join(foundrySystemDir, 'dnd35e') : 'dist';

// Copy static files to build output after Vite clears the directory,
// and generate system.json from system.json.template with version substitution.
function copyStaticFiles (): Plugin {
  return {
    name: 'copy-static-files',
    apply: 'build',
    async closeBundle () {
      // Generate system.json from template
      const pkg = await fs.readJSON(path.resolve(__dirname, 'package.json'));
      const version: string = pkg.version ?? '0.0.0';
      const template = await fs.readFile(path.resolve(__dirname, 'system.json.template'), 'utf8');
      const generated = template.replaceAll('{{VERSION}}', version);
      await fs.writeFile(path.join(buildOutDir, 'system.json'), generated);

      // Copy other static files
      const staticFiles = ['README.md'];
      for (const file of staticFiles) {
        const src = path.resolve(__dirname, file);
        if (await fs.pathExists(src)) {
          await fs.copy(src, path.join(buildOutDir, file));
        }
      }
    },
  };
}

// Copy .hbs templates into dist/hbsTemplates
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function copyHbsFiles (): Plugin {
  return {
    name: 'copy-hbs-files',
    apply: 'build',
    async closeBundle () {
      const files = await fg('src/**/*.hbs');
      for (const file of files) {
        const rel = path.relative('src', file);
        const dest = path.join('dist/hbsTemplates', rel);
        await fs.ensureDir(path.dirname(dest));
        await fs.copy(file, dest);
      }
    },
  };
}

function logBuildTimestamp (): Plugin {
  return {
    name: 'log-build-timestamp',
    apply: 'build',
    enforce: 'post',
    closeBundle () {
      const time = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      console.log(`Finished at ${time} → ${path.resolve(buildOutDir)}`);
    },
  };
}

// Glob lang files
function bundleLangFiles (): Plugin {
  return {
    name: 'bundle-lang-files',
    async closeBundle () {
      const srcRoot = path.resolve(__dirname, 'src/lang');
      const distRoot = path.resolve(__dirname, buildOutDir, 'lang');

      // Find all language directories
      const langDirs = await fs.readdir(srcRoot);

      for (const langCode of langDirs) {
        const langPath = path.join(srcRoot, langCode);
        const stat = await fs.stat(langPath);
        if (!stat.isDirectory()) continue;

        // Find all JSON files in this language folder (recursive)
        const files = await fg('**/*.json', { cwd: langPath, absolute: true });

        let merged: Record<string, any> = {};

        for (const file of files) {
          const json = await fs.readJSON(file);
          merged = deepmerge(merged, json, { arrayMerge: (_target, source) => source });
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

export default defineConfig(({ command }) => {
  if (command === 'build' && !foundrySystemDir) {
    console.warn(
      '⚠️  foundrySystemDir is not configured — building to dist/ (CI mode).\n' +
      '   For local development, copy local.config.json.example → local.config.json and set the path.'
    );
  }

  return ({
    resolve: {
      alias: {
        '@vueApps': path.resolve(__dirname, 'src/vue/apps'),
        '@vueStores': path.resolve(__dirname, 'src/vue/stores'),
        '@vc': path.resolve(__dirname, 'src/vue/components'),
        '@canvas': path.resolve(__dirname, 'src/canvas'),
        '@constants': path.resolve(__dirname, 'src/constants'),
        '@helpers': path.resolve(__dirname, 'src/helpers'),
        '@items': path.resolve(__dirname, 'src/entities/items'),
        '@actors': path.resolve(__dirname, 'src/entities/actors'),
        '@entities': path.resolve(__dirname, 'src/entities'),
        '@scene': path.resolve(__dirname, 'src/scene'),
        '@settings': path.resolve(__dirname, 'src/settings'),
        '@source': path.resolve(__dirname, 'src'),
        '@effects': path.resolve(__dirname, 'src/entities/activeEffects'),
        '@ec': path.resolve(__dirname, 'src/entities/components'),
      },
    },
    plugins: [
      tsconfigPaths(),
      copyStaticFiles(),
      // copyHbsFiles(),
      bundleLangFiles(),
      vue(),
      logBuildTimestamp(),
    ],
    build: {
      outDir: buildOutDir,
      emptyOutDir: true,
      sourcemap: true,
      ssr: false,
      minify: false,
      cssMinify: false,
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

            // Default: strip src/ if present
            if (normalized.startsWith('src/')) {
              return normalized.slice('src/'.length);
            }

            return '[name][extname]';
          },
        },
      },
    },
  });
});
