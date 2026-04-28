/**
 * Standalone helper: generates system.json from system.json.template and copies
 * it to your local Foundry systems directory.
 *
 * This script is NOT part of the main build pipeline — the Vite plugin in
 * vite.config.ts handles system.json generation during `npm run build`.
 * Use this only when you need to push an updated system.json to Foundry
 * without running a full build (e.g. after changing version in package.json).
 *
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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

// --- Read version from package.json (single source of truth) ---
const packageJsonPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version ?? '0.0.0';

// --- Read template ---
const templatePath = path.join(root, 'system.json.template');
if (!fs.existsSync(templatePath)) {
  console.error('❌ system.json.template not found');
  process.exit(1);
}

let content = fs.readFileSync(templatePath, 'utf8');

// Substitute {{VERSION}}
content = content.replaceAll('{{VERSION}}', version);

// Validate result is valid JSON
try {
  JSON.parse(content);
} catch (err) {
  console.error('❌ Generated system.json is not valid JSON:', err.message);
  process.exit(1);
}

// --- Write directly to Foundry system directory ---
if (foundrySystemDir) {
  const systemDir = path.join(foundrySystemDir, 'dnd35e');
  if (!fs.existsSync(systemDir)) {
    fs.mkdirSync(systemDir, { recursive: true });
  }
  const destPath = path.join(systemDir, 'system.json');
  fs.writeFileSync(destPath, content);
  console.log(`✅ Generated system.json (version: ${version}) → ${destPath}`);
} else {
  console.log('ℹ️  No foundrySystemDir configured — nothing to write (use npm run build for a full build).');
}
