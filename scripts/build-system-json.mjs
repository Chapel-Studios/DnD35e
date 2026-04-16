/**
 * Build script: generates system.json from system.json.template.
 *
 * Reads local.config.json (git-ignored) for per-developer settings:
 *   { "foundrySystemDir": "C:/path/to/Foundry/Data/systems" }
 *
 * Substitutes {{VERSION}} from version.yaml.
 * Requires foundrySystemDir — fails if not configured.
 *
 * Usage:
 *   node scripts/build-system-json.mjs
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

const foundrySystemDir = localConfig.foundrySystemDir;
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

// Validate result is valid JSON
try {
  JSON.parse(content);
} catch (err) {
  console.error('❌ Generated system.json is not valid JSON:', err.message);
  process.exit(1);
}

// --- Write system.json to repo root ---
const outputPath = path.join(root, 'system.json');
fs.writeFileSync(outputPath, content);
console.log(`✅ Generated system.json (version: ${version})`);

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
