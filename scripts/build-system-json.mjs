/**
 * Build script: generates system.json from system.json.template.
 *
 * Reads local.config.json (git-ignored) for per-developer settings:
 *   { "foundrySystemDir": "C:/path/to/Foundry/Data/systems" }
 *
 * foundrySystemDir should point to the Foundry Data/systems directory
 * (not the dnd35e subfolder — the script appends that automatically).
 * If the path ends with /dnd35e, it is normalized to the parent.
 *
 * Substitutes {{VERSION}} from version.yaml.
 *
 * Pack handling:
 *   - Each entry in packs[] may carry an internal "_dev": true flag.
 *   - In dev builds (--dev), all packs are kept. In prod builds, packs
 *     with _dev:true are stripped.
 *   - The _dev key itself is always removed before writing (it is not
 *     part of Foundry's PackageCompendiumData schema).
 *   - path defaults to "packs/{name}" when absent.
 *   - system defaults to "dnd35e" when absent.
 *   - packFolders[].packs[] entries that reference stripped (dev-only)
 *     packs are filtered out; remaining entries must reference a known
 *     pack or the build fails.
 *
 * Without local.config.json, runs in CI mode (generates in-repo, skips copy).
 *
 * Usage:
 *   node scripts/build-system-json.mjs           # prod build
 *   node scripts/build-system-json.mjs --dev     # dev build (includes _dev packs)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// --- Parse CLI flags ---
const isDev = process.argv.includes('--dev');

// --- Read local config (git-ignored, optional for CI) ---
const localConfigPath = path.join(root, 'local.config.json');
let localConfig = {};
if (fs.existsSync(localConfigPath)) {
  try {
    localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
  } catch (err) {
    console.error('❌ local.config.json contains invalid JSON.');
    console.error('   See local.config.json.example for the expected shape.');
    process.exit(1);
  }
} else {
  console.warn('⚠️  local.config.json not found — generating system.json in-repo only (CI mode).');
}

// Normalize: strip trailing /dnd35e if the developer included it
let foundrySystemDir = localConfig.foundrySystemDir;
if (foundrySystemDir && path.basename(foundrySystemDir) === 'dnd35e') {
  foundrySystemDir = path.dirname(foundrySystemDir);
}
if (foundrySystemDir && !fs.existsSync(foundrySystemDir)) {
  console.error(`❌ foundrySystemDir does not exist: ${foundrySystemDir}`);
  console.error('   Create the directory or fix local.config.json.');
  process.exit(1);
}

// --- Read version from version.yaml ---
const versionYamlPath = path.join(root, 'version.yaml');
let version = '0.0.0';
if (fs.existsSync(versionYamlPath)) {
  const yaml = fs.readFileSync(versionYamlPath, 'utf8');
  const match = yaml.match(/current:\s*"([^"]+)"/);
  if (match) version = match[1];
}

// --- Read template ---
const templatePath = path.join(root, 'system.json.template');
if (!fs.existsSync(templatePath)) {
  console.error('❌ system.json.template not found');
  process.exit(1);
}

let content = fs.readFileSync(templatePath, 'utf8');

// Substitute {{VERSION}}
content = content.replace('{{VERSION}}', version);

// Validate result is valid JSON and parse so we can expand packs/packFolders.
let manifest;
try {
  manifest = JSON.parse(content);
} catch (err) {
  console.error('❌ Generated system.json is not valid JSON:', err.message);
  process.exit(1);
}

// --- Expand packs[]: strip _dev entries in prod, default path/system ---
if (Array.isArray(manifest.packs)) {
  const expanded = [];
  const strippedPackNames = new Set();
  for (const pack of manifest.packs) {
    if (pack._dev === true && !isDev) {
      strippedPackNames.add(pack.name);
      continue;
    }
    // Drop the _dev key (not part of Foundry's schema) before emitting.
    const { _dev, ...rest } = pack;
    if (!rest.path) rest.path = `packs/${rest.name}`;
    if (!rest.system) rest.system = 'dnd35e';
    expanded.push(rest);
  }
  manifest.packs = expanded;

  // --- Validate packFolders[].packs[] references; drop stripped names ---
  if (Array.isArray(manifest.packFolders)) {
    const knownPackNames = new Set(expanded.map(p => p.name));
    for (const folder of manifest.packFolders) {
      if (!Array.isArray(folder.packs)) continue;
      const filtered = [];
      for (const packName of folder.packs) {
        if (strippedPackNames.has(packName)) continue; // dev-only pack, silently drop in prod
        if (!knownPackNames.has(packName)) {
          console.error(
            `❌ packFolders entry "${folder.name}" references unknown pack "${packName}"`
          );
          process.exit(1);
        }
        filtered.push(packName);
      }
      folder.packs = filtered;
    }
  }
}

content = JSON.stringify(manifest, null, 2) + '\n';

// --- Write system.json to repo root ---
const outputPath = path.join(root, 'system.json');
fs.writeFileSync(outputPath, content);
console.log(`✅ Generated system.json (version: ${version}, mode: ${isDev ? 'dev' : 'prod'})`);

// --- Copy to Foundry system directory (skip in CI when foundrySystemDir is absent) ---
if (foundrySystemDir) {
  const systemDir = path.join(foundrySystemDir, 'dnd35e');
  if (!fs.existsSync(systemDir)) {
    fs.mkdirSync(systemDir, { recursive: true });
  }
  const destPath = path.join(systemDir, 'system.json');
  fs.copyFileSync(outputPath, destPath);
  console.log(`✅ Copied system.json → ${destPath}`);
} else {
  console.log('ℹ️  Skipping copy to Foundry directory (no foundrySystemDir configured).');
}
