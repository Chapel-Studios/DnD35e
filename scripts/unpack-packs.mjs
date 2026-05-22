#!/usr/bin/env node
/**
 * unpack-packs.mjs
 *
 * Extracts compiled Foundry LevelDB packs back to their JSON source trees under
 * `packs/_source/<packName>/`, using `extractPack` from `@foundryvtt/foundryvtt-cli`.
 *
 * The `--folders` option causes the CLI to write `_Folder*.json` files into
 * subdirectories that mirror the in-pack folder hierarchy, enabling a clean
 * round-trip: Foundry UI (create items + folders) → unpack → commit JSON → build.
 *
 * Reads local.config.json (git-ignored) for per-developer settings.
 * Requires `foundryRootPath` (or `foundryDataPath` override) to be set.
 * This script is intentionally local-only — it cannot run in CI.
 *
 * Usage:
 *   npm run unpack                                   # all packs (including dev-only)
 *   npm run unpack -- --pack materials               # single pack
 *   npm run unpack -- --pack materials,documentation # comma-separated list
 *
 * Flags:
 *   --pack <names>   Comma-separated pack names to unpack. Omit to unpack all.
 */

import { extractPack } from '@foundryvtt/foundryvtt-cli';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ─── Parse --pack flag ───────────────────────────────────────────────────────

/** @returns {string | undefined} */
function parsePackArg () {
  const args = process.argv.slice(2);
  const eqIdx = args.findIndex((a) => a.startsWith('--pack='));
  if (eqIdx !== -1) return args[eqIdx].slice('--pack='.length);
  const flagIdx = args.indexOf('--pack');
  if (flagIdx !== -1 && args[flagIdx + 1]) return args[flagIdx + 1];
  return undefined;
}

const packArg = parsePackArg();
const requestedNames = packArg ? packArg.split(',').map((s) => s.trim()).filter(Boolean) : null;

// ─── Local config ────────────────────────────────────────────────────────────

const localConfigPath = path.join(repoRoot, 'local.config.json');
if (!fs.existsSync(localConfigPath)) {
  console.error('❌ local.config.json not found.');
  console.error('   This script requires a local Foundry installation.');
  console.error('   See local.config.json.example for the expected shape.');
  process.exit(1);
}

let localConfig;
try {
  localConfig = await fs.readJson(localConfigPath);
} catch {
  console.error('❌ local.config.json contains invalid JSON.');
  process.exit(1);
}

const foundryDataPath =
  localConfig.foundryDataPath
  ?? (localConfig.foundryRootPath
    ? path.join(localConfig.foundryRootPath, 'Data')
    : undefined);

if (!foundryDataPath) {
  console.error('❌ local.config.json must set foundryRootPath or foundryDataPath.');
  process.exit(1);
}

// ─── Load pack list from template (includes dev-only packs) ───────────────────

const templatePath = path.join(repoRoot, 'system.json.template');
if (!fs.existsSync(templatePath)) {
  console.error('❌ system.json.template not found.');
  process.exit(1);
}

const template = await fs.readJson(templatePath);
const allPacks = Array.isArray(template.packs) ? template.packs : [];
const knownNames = allPacks.map((p) => p.name);

// Resolve the target list — validate any explicitly requested names up front
let targetPacks;
if (requestedNames) {
  const unknown = requestedNames.filter((n) => !knownNames.includes(n));
  if (unknown.length > 0) {
    console.error(`❌ Unknown pack(s): ${unknown.join(', ')}`);
    console.error(`   Available: ${knownNames.join(', ')}`);
    process.exit(1);
  }
  targetPacks = allPacks.filter((p) => requestedNames.includes(p.name));
} else {
  targetPacks = allPacks;
}

if (targetPacks.length === 0) {
  console.log('ℹ️  No packs to unpack.');
  process.exit(0);
}

// ─── Unpack each target ───────────────────────────────────────────────────────

const buildOutDir = path.join(foundryDataPath, 'systems', 'dnd35e');

let failed = 0;
for (const pack of targetPacks) {
  const packPath = pack.path ?? `packs/${pack.name}`;
  const srcLevelDb = path.join(buildOutDir, packPath);
  const destSource = path.join(repoRoot, 'packs', '_source', pack.name);

  if (!fs.existsSync(srcLevelDb)) {
    console.warn(`⚠️  "${pack.name}" — compiled pack not found at ${srcLevelDb}, skipping.`);
    console.warn('     Run `npm run build:dev` first to compile this pack.');
    continue;
  }

  console.log(`📦 Unpacking "${pack.name}"...`);

  // `folders: true` writes _Folder*.json files into subdirectories that mirror
  // the in-pack folder hierarchy, enabling a clean unpack → edit → build round-trip.
  try {
    await extractPack(srcLevelDb, destSource, { folders: true });
    console.log(`   ✅ Done → packs/_source/${pack.name}/`);
  } catch (err) {
    if (String(err.message).includes('EBUSY') || String(err.message).includes('EPERM')
        || err.code === 'LEVEL_DATABASE_NOT_OPEN') {
      console.error(`   ❌ "${pack.name}" — LevelDB locked (Foundry is running?). Close Foundry and retry.`);
    } else if (err.code === 'LEVEL_ITERATOR_NOT_OPEN') {
      console.error(`   ❌ "${pack.name}" — LevelDB is corrupt or unreadable (code: ${err.code}).`);
      console.error(`        Delete the compiled pack and recompile: Remove-Item -Recurse "${srcLevelDb}"; npm run build:dev`);
    } else {
      console.error(`   ❌ "${pack.name}" — ${err.message} (code: ${err.code ?? 'none'})`);
    }
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n❌ ${failed} pack(s) failed to unpack.`);
  process.exit(1);
}
