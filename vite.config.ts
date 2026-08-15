import vue from '@vitejs/plugin-vue';
import deepmerge from 'deepmerge';
import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import { createLogger, defineConfig, Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { compilePacks } from './vite-plugin-compile-packs';

// These are runtime-relative CSS/SFC asset urls (e.g. `../dnd35e/assets/foo.svg`) that
// intentionally resolve relative to the file's final location inside Foundry's systems dir,
// not relative to the source file — Vite can't statically resolve them, but they're valid
// at runtime, so silence the noisy per-occurrence warning.
const viteLogger = createLogger();
const rawWarnOnce = viteLogger.warnOnce.bind(viteLogger);
viteLogger.warnOnce = (msg, options) => {
  if (msg.includes('didn\'t resolve at build time')) return;
  rawWarnOnce(msg, options);
};

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
// Default: build directly into the dev Foundry data dir (convenient for hot-iteration).
// Overridden to dist/ when mode === 'dist' (E2E and CI) so the build never touches
// a running Foundry's directory and avoids LevelDB / file-handle conflicts.
let buildOutDir = foundrySystemDir ? path.join(foundrySystemDir, 'dnd35e') : path.resolve(__dirname, 'dist');

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
      if (mode === 'production' || mode === 'dist') {
        await fs.emptyDir(buildOutDir);
        return;
      }
      // Dev: clear everything except packs/ and macros/ — both may have file handles
      // held by a running Foundry process (LevelDB for packs, served scripts for macros).
      // compilePacks soft-fails on locked LevelDB files; macro files are overwritten in place.
      const entries = await fs.readdir(buildOutDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'packs') continue;
        if (entry.name === 'macros') continue;
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
    async buildStart () {
      const assetFiles = await fg('src/assets/**/*.*');
      for (const file of assetFiles) {
        this.addWatchFile(path.resolve(__dirname, file));
      }
      const macroFiles = await fg('src/macros/**/*.mjs');
      for (const file of macroFiles) {
        this.addWatchFile(path.resolve(__dirname, file));
      }
    },
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
      // Copy Assets (e.g. icons, styles) to <buildOutDir>/assets/ for direct import in code and use in sheets.
      const assetFiles = await fg('src/assets/**/*.*');
      for (const file of assetFiles) {
        const rel = path.relative('src', file); // e.g. "assets/shield.svg"
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
    async buildStart () {
      const srcRoot = path.resolve(__dirname, 'src/lang');
      const files = await fg('src/lang/**/*.json');
      for (const file of files) {
        this.addWatchFile(path.resolve(__dirname, file));
      }
      // Also watch the lang root so new locale dirs are picked up
      this.addWatchFile(srcRoot);
    },
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
  // mode === 'dist': build to <repo>/dist, independent of any running Foundry instance.
  // Used by `npm run build:dist` which pretest:e2e runs before spawning the E2E Foundry.
  // mode === 'development' or 'production': build into the dev Foundry data dir as usual.
  if (mode === 'dist') {
    buildOutDir = path.resolve(__dirname, 'dist');
  }

  if (command === 'build' && !foundrySystemDir && mode !== 'dist') {
    console.warn(
      '⚠️  foundrySystemDir is not configured — building to dist/ (CI mode).\n' +
      '   For local development, copy local.config.json.example → local.config.json and set the path.'
    );
  }

  return ({
    customLogger: viteLogger,
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
