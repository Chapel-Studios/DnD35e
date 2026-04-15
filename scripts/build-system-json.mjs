/**
 * Build script: generates system.json from system.json.template.
 *
 * Reads local.config.json (git-ignored) for per-developer settings:
 *   { "foundrySystemDir": "C:/path/to/Foundry/Data/systems/dnd35e" }
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

// --- Read local config (REQUIRED, git-ignored) ---
const localConfigPath = path.join(root, 'local.config.json');
if (!fs.existsSync(localConfigPath)) {
  console.error('❌ local.config.json not found.');
  console.error('   Copy local.config.json.example → local.config.json and set foundrySystemDir.');
  process.exit(1);
}
const localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));

const foundrySystemDir = localConfig.foundrySystemDir;
if (!foundrySystemDir) {
  console.error('❌ foundrySystemDir is not set in local.config.json.');
  console.error('   Set it to your Foundry Data/systems path.');
  process.exit(1);
}
if (!fs.existsSync(foundrySystemDir)) {
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

// --- Copy to Foundry system directory ---
const systemDir = path.join(foundrySystemDir, 'dnd35e');
if (!fs.existsSync(systemDir)) {
  fs.mkdirSync(systemDir, { recursive: true });
}
const destPath = path.join(systemDir, 'system.json');
fs.copyFileSync(outputPath, destPath);
console.log(`✅ Copied system.json → ${destPath}`);
