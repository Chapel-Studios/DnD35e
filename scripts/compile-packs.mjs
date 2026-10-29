#!/usr/bin/env node
/**
 * compile-packs.mjs
 *
 * Manually (re)compiles every pack in `packs/_source/<name>/` into the dev Foundry data
 * dir's `systems/dnd35e/packs/<name>/` LevelDB store. Always does a full rebuild —
 * this is the deliberate "I want fresh packs" action, distinct from `dev:watch`
 * (which never touches packs) and `build:dev` (which only builds packs missing from
 * the output dir). Foundry must be closed first or compilation will fail on locked
 * LevelDB files.
 *
 * Reads `system.json` (already generated — run `npm run build:system-json:dev` first
 * if it's stale) for the pack list, and `local.config.json` for the output path.
 *
 * Usage:
 *   npm run packs:build
 */

import { compilePack } from '@foundryvtt/foundryvtt-cli';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const localConfigPath = path.join(root, 'local.config.json');
let localConfig = {};
if (fs.existsSync(localConfigPath)) {
  localConfig = fs.readJsonSync(localConfigPath);
} else {
  console.error('❌ local.config.json not found — see local.config.json.example.');
  process.exit(1);
}

const foundryDataPath = localConfig.foundryDataPath
  ?? (localConfig.foundryRootPath ? path.join(localConfig.foundryRootPath, 'Data') : undefined);
const foundrySystemDir = foundryDataPath ? path.join(foundryDataPath, 'systems') : undefined;
if (!foundrySystemDir) {
  console.error('❌ foundryRootPath/foundryDataPath is not configured in local.config.json.');
  process.exit(1);
}

const outRoot = path.join(foundrySystemDir, 'dnd35e');
const manifestPath = path.join(root, 'system.json');
const sourceRoot = path.join(root, 'packs', '_source');

if (!(await fs.pathExists(manifestPath))) {
  console.error(`❌ system.json not found at ${manifestPath} — run npm run build:system-json:dev first.`);
  process.exit(1);
}

function hasContent (entries) {
  return entries.some((f) => !f.startsWith('.') && !f.startsWith('_dev_only'));
}

const manifest = await fs.readJson(manifestPath);
const packs = Array.isArray(manifest.packs) ? manifest.packs : [];
if (packs.length === 0) {
  console.log('📦 No packs registered in system.json.');
  process.exit(0);
}

let compiled = 0;
let skipped = 0;
let failed = 0;

for (const pack of packs) {
  const srcDir = path.join(sourceRoot, pack.name);
  const destDir = path.join(outRoot, pack.path ?? `packs/${pack.name}`);

  if (!(await fs.pathExists(srcDir)) || !hasContent(await fs.readdir(srcDir))) {
    skipped++;
    continue;
  }

  try {
    if (await fs.pathExists(destDir)) await fs.remove(destDir);
    await fs.ensureDir(destDir);
    await compilePack(srcDir, destDir, { recursive: true, log: false });
    compiled++;
    console.log(`📦 Compiled pack: ${pack.name}`);
  } catch (err) {
    failed++;
    console.error(`❌ Failed to compile "${pack.name}": ${err.message.split('\n')[0]}`);
    console.error('   Is Foundry still open? Close it and retry.');
  }
}

console.log(`📦 Done — ${compiled} compiled, ${skipped} skipped (empty/missing), ${failed} failed.`);
if (failed > 0) process.exit(1);
