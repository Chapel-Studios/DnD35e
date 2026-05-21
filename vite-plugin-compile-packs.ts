/**
 * vite-plugin-compile-packs
 *
 * Compiles JSON pack sources under `packs/_source/<name>/` into Foundry v14 LevelDB packs
 * at `<buildOutDir>/packs/<name>/`. Pack list is read from the generated `system.json` so
 * the plugin honors the dev/prod stripping done by `scripts/build-system-json.mjs`.
 *
 * Empty source directories (only `.gitkeep` / dotfiles) are skipped — useful early in the
 * project lifecycle when pack registrations exist before any authored content.
 */

import { compilePack } from '@foundryvtt/foundryvtt-cli';
import fs from 'fs-extra';
import path from 'path';
import type { Plugin } from 'vite';

interface CompilePacksOptions {
  /** Absolute path to `system.json` (the generated one, source of pack list). */
  manifestPath: string;
  /** Absolute path to `packs/_source/`. */
  sourceRoot: string;
  /** Absolute path to the Vite build output dir (Foundry system dir or `dist/`). */
  outRoot: string;
  /**
   * Vite mode (`'development'` | `'production'`).
   * Dev mode: per-pack errors are caught and recorded in `build-warnings.json`
   *   instead of aborting the build (Foundry may hold LevelDB locks).
   * Prod mode (default): any compilation error hard-fails the build.
   */
  mode?: string;
}

function hasContent (entries: string[]): boolean {
  return entries.some((f) => !f.startsWith('.') && !f.startsWith('_dev_only'));
}

export function compilePacks (options: CompilePacksOptions): Plugin {
  return {
    name: 'compile-packs',
    apply: 'build',
    enforce: 'post',
    async closeBundle () {
      const isDev = options.mode === 'development';
      const warningsPath = path.join(options.outRoot, 'build-warnings.json');

      if (!(await fs.pathExists(options.manifestPath))) {
        console.warn(`⚠️  compile-packs: manifest not found at ${options.manifestPath}, skipping.`);
        return;
      }

      const manifest = await fs.readJson(options.manifestPath);
      const packs: Array<{ name: string; path?: string }> = Array.isArray(manifest.packs) ? manifest.packs : [];
      if (packs.length === 0) return;

      let compiled = 0;
      let skipped = 0;
      const skippedNames: string[] = [];
      const stalePacks: string[] = [];
      const staleErrors: Record<string, string> = {};

      for (const pack of packs) {
        const srcDir = path.join(options.sourceRoot, pack.name);
        const destDir = path.join(options.outRoot, pack.path ?? `packs/${pack.name}`);

        if (!(await fs.pathExists(srcDir))) {
          skipped++;
          skippedNames.push(`${pack.name} (no source dir)`);
          continue;
        }

        const entries = await fs.readdir(srcDir);
        if (!hasContent(entries)) {
          skipped++;
          skippedNames.push(pack.name);
          continue;
        }

        try {
          // Clean destination before compile so removed entries don't linger
          if (await fs.pathExists(destDir)) {
            await fs.remove(destDir);
          }
          await fs.ensureDir(destDir);

          // Cast: foundryvtt-cli's bundled types omit `recursive`/`log` though they're supported at runtime.
          await compilePack(srcDir, destDir, { recursive: true, log: false } as Parameters<typeof compilePack>[2]);
          compiled++;
          console.log(`📦 Compiled pack: ${pack.name}`);
        } catch (err) {
          if (isDev) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`⚠️  compile-packs: skipped "${pack.name}" — ${msg.split('\n')[0]}`);
            stalePacks.push(pack.name);
            staleErrors[pack.name] = msg;
          } else {
            throw err; // prod: hard-fail
          }
        }
      }

      if (compiled === 0 && skipped > 0) {
        console.log(`📦 No packs to compile (${skipped} empty/missing: ${skippedNames.join(', ')})`);
      } else if (skipped > 0) {
        console.log(`📦 Skipped ${skipped} empty pack(s): ${skippedNames.join(', ')}`);
      }

      // In dev mode: write/clear build-warnings.json so Foundry can surface stale-pack notices.
      if (isDev) {
        if (stalePacks.length > 0) {
          await fs.writeJson(warningsPath, { stalePacks, errors: staleErrors, buildTime: new Date().toISOString() }, { spaces: 2 });
          console.warn(`⚠️  ${stalePacks.length} stale pack(s) — Foundry was open during build: ${stalePacks.join(', ')}`);
        } else if (await fs.pathExists(warningsPath)) {
          await fs.remove(warningsPath); // all packs compiled successfully, clear previous warning
        }
      }
    },
  };
}
