/**
 * Build script: generates the E2E test world's `world.json` from
 * `world.json.template`.
 *
 * Mirrors `build-system-json.mjs`. The pristine Playwright snapshot lives at
 * `tests/e2e/fixtures/test-world/dnd35e-e2e/` and its manifest must track the
 * system version we're testing against. We template the version so a
 * `version.yaml` bump doesn't require hand-editing the snapshot manifest.
 *
 * Generated file (`world.json`) is git-ignored — only the template is committed.
 *
 * Substitutes `{{VERSION}}` from version.yaml.
 *
 * Usage:
 *   node scripts/build-test-world-json.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// --- Read version from version.yaml ---
const versionYamlPath = path.join(root, 'version.yaml');
let version = '0.0.0';
if (fs.existsSync(versionYamlPath)) {
  const yaml = fs.readFileSync(versionYamlPath, 'utf8');
  const match = yaml.match(/current:\s*"([^"]+)"/);
  if (match) version = match[1];
}

// --- Read template ---
// Template lives one level above the world directory so it survives snapshot
// rebuilds (the world dir gets wiped + recopied wholesale during snapshot
// regeneration; the template is the durable, committed source of truth).
const testWorldDir = path.join(root, 'tests', 'e2e', 'fixtures', 'test-world');
const templatePath = path.join(testWorldDir, 'world.json.template');
if (!fs.existsSync(templatePath)) {
  console.error(`❌ world.json.template not found at ${templatePath}`);
  process.exit(1);
}

let content = fs.readFileSync(templatePath, 'utf8');
content = content.replace('{{VERSION}}', version);

// Validate result is valid JSON
try {
  JSON.parse(content);
} catch (err) {
  console.error('❌ Generated world.json is not valid JSON:', err.message);
  process.exit(1);
}

// --- Write world.json into the world directory ---
const outputPath = path.join(testWorldDir, 'dnd35e-e2e', 'world.json');
fs.writeFileSync(outputPath, content);
console.log(`✅ Generated test-world world.json (version: ${version})`);
