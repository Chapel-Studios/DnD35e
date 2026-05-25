/**
 * setup-e2e.mjs — provisions a Foundry data dir for Playwright E2E runs.
 *
 * Reads `local.config.json` for Foundry app path, license key, and target data
 * dir. Writes a minimal Config/options.json and Config/license.json so Foundry
 * boots straight past the setup/license screens. Symlinks the built system into
 * `Data/systems/dnd35e/` and copies the pristine snapshot world into
 * `Data/worlds/dnd35e-e2e/`.
 *
 * This is the equivalent of D35E's `dev-setup.js` / `e2e:setup`, adapted to
 * our `local.config.json` convention and our committed test-world snapshot.
 *
 * Usage:
 *   node scripts/setup-e2e.mjs
 *
 * Idempotent: wipes the target dir each run so every test session starts
 * from a known state. Cheap because the snapshot is < 1 MB.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { platform } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// --- Read local.config.json ------------------------------------------------
const localConfigPath = path.join(REPO_ROOT, 'local.config.json');
if (!existsSync(localConfigPath)) {
  console.error('[setup-e2e] local.config.json not found. Copy local.config.json.example and fill in foundryRootPath.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(localConfigPath, 'utf8'));

// Canonical key: foundryRootPath (the Foundry install root, e.g.
// "C:/Foundry/V14.359"). Standard Foundry layout under root:
//   <root>/App/resources/app/main.js  — the app entrypoint (fixed)
//   <root>/Config/license.json         — signed license payload
//   <root>/Data/                       — user data (overridable via foundryDataPath)
//   <root>/Data/systems/<id>/          — installed systems (fixed under data)
//   <root>/Data/worlds/<id>/           — worlds (fixed under data)
//
// Only foundryDataPath is overridable — it maps to Foundry's --dataPath flag.
// systems/ and App/resources/app/ are hardcoded by Foundry.
const foundryRootPath = config.foundryRootPath;
const foundryDataPath = config.foundryDataPath
  ?? (foundryRootPath ? path.join(foundryRootPath, 'Data') : undefined);
const foundryAppPath = foundryRootPath
  ? path.join(foundryRootPath, 'App', 'resources', 'app')
  : undefined;
const foundrySystemDir = foundryDataPath
  ? path.join(foundryDataPath, 'systems')
  : undefined;
const foundryLicenseFile = config.foundryLicenseFile
  ?? (foundryRootPath ? path.join(foundryRootPath, 'Config', 'license.json') : undefined);

const port = config.foundryE2EPort ?? 31000;
// Default to repo-local so contributors can inspect post-failure state.
const dataDir = config.foundryE2EDataDir
  ?? path.join(REPO_ROOT, 'tests', 'e2e', '.foundry-data');
// Path to the built system. `npm run build:dist` (used by pretest:e2e) always
// outputs to <repo>/dist so the E2E Foundry is fully independent of any running
// dev Foundry instance. Fall back to the dev system dir only for manual/legacy runs.
const distDir = path.join(REPO_ROOT, 'dist');
const systemSourceDir = existsSync(distDir)
  ? distDir
  : (foundrySystemDir ? path.join(foundrySystemDir, 'dnd35e') : distDir);

if (!foundryAppPath) {
  console.error('[setup-e2e] foundryRootPath missing in local.config.json.');
  process.exit(1);
}
if (!existsSync(systemSourceDir)) {
  console.error(`[setup-e2e] System source not found at ${systemSourceDir}. Run "npm run build:dist" first.`);
  process.exit(1);
}

const snapshotDir = path.join(REPO_ROOT, 'tests', 'e2e', 'fixtures', 'test-world', 'dnd35e-e2e');
if (!existsSync(snapshotDir) || !existsSync(path.join(snapshotDir, 'world.json'))) {
  console.error(`[setup-e2e] Snapshot or world.json missing at ${snapshotDir}. Run "npm run build:test-world-json" first.`);
  process.exit(1);
}

// --- Resolve license source -----------------------------------------------
// Foundry's license.json is a signed payload, portable across machines once
// activated. Resolution order:
//   1. E2E_LICENSE_JSON env var (CI secret — full JSON contents as string)
//   2. E2E_LICENSE_PATH env var or config.foundryLicenseFile (explicit path)
//   3. <foundryRootPath>/Config/license.json (default Foundry layout)
//   4. Hard fail with activation instructions
const licenseFromEnv = process.env.E2E_LICENSE_JSON;
const explicitLicensePath = process.env.E2E_LICENSE_PATH ?? config.foundryLicenseFile;
const defaultLicensePath = foundryLicenseFile;

let licenseSource = null;
let licenseContents = null;
if (licenseFromEnv) {
  licenseContents = licenseFromEnv;
  licenseSource = 'E2E_LICENSE_JSON env var';
} else if (explicitLicensePath && existsSync(explicitLicensePath)) {
  licenseSource = path.resolve(explicitLicensePath);
} else if (defaultLicensePath && existsSync(defaultLicensePath)) {
  licenseSource = defaultLicensePath;
}

if (!licenseSource) {
  console.error('[setup-e2e] No signed Foundry license.json found.');
  console.error('[setup-e2e]   Local dev:  activate Foundry once on this machine (any world boot will do)');
  console.error(`[setup-e2e]               or set foundryLicenseFile in local.config.json (looked for ${defaultLicensePath ?? '<unset>'})`);
  console.error('[setup-e2e]   CI:         set E2E_LICENSE_JSON env var to the contents of a signed license.json');
  process.exit(1);
}

console.log(`[setup-e2e] Foundry root:    ${foundryRootPath}`);
console.log(`[setup-e2e] Foundry app:     ${foundryAppPath}`);
console.log(`[setup-e2e] Foundry data:    ${foundryDataPath}`);
console.log(`[setup-e2e] System source:   ${systemSourceDir}`);
console.log(`[setup-e2e] Snapshot:        ${snapshotDir}`);
console.log(`[setup-e2e] License source:  ${licenseSource}`);
console.log(`[setup-e2e] Data dir:        ${dataDir}`);
console.log(`[setup-e2e] Port:            ${port}`);

// --- 1. Wipe + recreate data dir ------------------------------------------
if (existsSync(dataDir)) {
  rmSync(dataDir, { recursive: true, force: true });
}
for (const sub of ['Config', 'Data/systems', 'Data/worlds', 'Logs']) {
  mkdirSync(path.join(dataDir, sub), { recursive: true });
}

// --- 2. Config/options.json -----------------------------------------------
// Pre-fills the setup screen so Foundry boots into the world immediately.
const options = {
  dataPath: dataDir,
  hostname: 'localhost',
  language: 'en.core',
  port,
  proxyPort: null,
  proxySSL: false,
  routePrefix: null,
  updateChannel: 'stable',
  upnp: false,
  fullscreen: false,
  world: 'dnd35e-e2e',
};
writeFileSync(
  path.join(dataDir, 'Config/options.json'),
  JSON.stringify(options, null, 2)
);

// --- 3. Config/license.json -----------------------------------------------
// The signed license payload is portable across machines once activated.
// Write from env var contents (CI) or copy from disk (local dev).
if (licenseContents) {
  writeFileSync(path.join(dataDir, 'Config/license.json'), licenseContents);
} else {
  cpSync(licenseSource, path.join(dataDir, 'Config/license.json'));
}

// --- 4. Symlink system source ---------------------------------------------
const systemLink = path.join(dataDir, 'Data/systems/dnd35e');
const linkType = platform() === 'win32' ? 'junction' : 'dir';
symlinkSync(systemSourceDir, systemLink, linkType);
console.log(`[setup-e2e] Linked Data/systems/dnd35e → ${systemSourceDir}`);

// --- 5. Copy world snapshot -----------------------------------------------
const worldDest = path.join(dataDir, 'Data/worlds/dnd35e-e2e');
cpSync(snapshotDir, worldDest, { recursive: true });
console.log(`[setup-e2e] Copied snapshot → Data/worlds/dnd35e-e2e`);

console.log('[setup-e2e] ✅ Ready. Playwright will spawn Foundry on next test:e2e.');
