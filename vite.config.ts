import vue from '@vitejs/plugin-vue';
import deepmerge from 'deepmerge';
import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { compilePacks } from './vite-plugin-compile-packs';

// Read local developer config (git-ignored) for per-machine paths
const localConfigPath = path.resolve(__dirname, 'local.config.json');
let localConfig: {
  foundryRootPath?: string;
  foundryDataPath?: string;
} = {};
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
// Derive systems dir from foundryDataPath (overridable) or foundryRootPath.
// Standard Foundry layout: <root>/Data/systems — systems/ is fixed under data.
const foundryDataPath = localConfig.foundryDataPath
  ?? (localConfig.foundryRootPath
    ? path.join(localConfig.foundryRootPath, 'Data')
    : undefined);
const foundrySystemDir = foundryDataPath
  ? path.join(foundryDataPath, 'systems')
  : undefined;
const buildOutDir = foundrySystemDir ? path.join(foundrySystemDir, 'dnd35e') : 'dist';

// Replace Vite's built-in emptyOutDir with a mode-aware alternative.
// Prod: hard-deletes the full output dir (mirrors emptyOutDir:true behaviour).
// Dev: skips the packs/ subdirectory so Foundry's LevelDB locks can't abort the build.
//      Pack compilation is handled (with soft-fail) by the compilePacks plugin.
function cleanOutputDir (mode: string): Plugin {
  return {
    name: 'clean-output-dir',
    apply: 'build',
    enforce: 'pre',
    async buildStart () {
      if (!(await fs.pathExists(buildOutDir))) return;
      if (mode === 'production') {
        await fs.emptyDir(buildOutDir);
        return;
      }
      // Dev: clear everything except packs/ — compilePacks soft-fails on locked LevelDB files
      const entries = await fs.readdir(buildOutDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'packs') continue;
        await fs.remove(path.join(buildOutDir, entry.name));
      }
      // Dev: best-effort prune of pack directories no longer in the manifest
      const packsDir = path.join(buildOutDir, 'packs');
      if (await fs.pathExists(packsDir)) {
        const sysJsonPath = path.resolve(__dirname, 'system.json');
        if (await fs.pathExists(sysJsonPath)) {
          const sysJson = await fs.readJson(sysJsonPath);
          const activePacks = new Set<string>(
            (sysJson.packs ?? []).map((p: { name: string; path?: string }) =>
              path.basename(p.path ?? p.name)
            )
          );
          const packEntries = await fs.readdir(packsDir, { withFileTypes: true });
          for (const entry of packEntries) {
            if (!entry.isDirectory() || activePacks.has(entry.name)) continue;
            try {
              await fs.remove(path.join(packsDir, entry.name));
              console.log(`[cleanOutputDir] removed stale pack: ${entry.name}`);
            } catch (err) {
              console.warn(`[cleanOutputDir] could not remove stale pack "${entry.name}": ${(err as Error).message}`);
            }
          }
        }
      }
    },
  };
}

// Copy static files to build output after Vite clears the directory
function copyStaticFiles (): Plugin {
  return {
    name: 'copy-static-files',
    apply: 'build',
    async closeBundle () {
      const staticFiles = ['README.md', 'system.json'];
      for (const file of staticFiles) {
        const src = path.resolve(__dirname, file);
        if (await fs.pathExists(src)) {
          await fs.copy(src, path.join(buildOutDir, file));
        }
      }
      // Copy src/macros/** → <buildOutDir>/macros/ (dev macro scripts, loaded by fetch+eval)
      const macroFiles = await fg('src/macros/**/*.mjs');
      for (const file of macroFiles) {
        const rel = path.relative('src', file); // e.g. "macros/import-csv-items.mjs"
        await fs.copy(path.resolve(__dirname, file), path.join(buildOutDir, rel));
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

export default defineConfig(({ command, mode }) => {
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
      tsconfigPaths(),
      cleanOutputDir(mode),
      copyStaticFiles(),
      // copyHbsFiles(),
      bundleLangFiles(),
      compilePacks({
        manifestPath: path.resolve(__dirname, 'system.json'),
        sourceRoot: path.resolve(__dirname, 'packs/_source'),
        outRoot: path.resolve(__dirname, buildOutDir),
        mode,
      }),
      vue(),
      logBuildTimestamp(),
    ],
    build: {
      outDir: buildOutDir,
      emptyOutDir: false, // cleanOutputDir plugin handles this with mode-aware logic
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
