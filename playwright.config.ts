import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read local developer config (git-ignored) for Foundry license + paths.
// Foundry's EULA allows multiple instances per license for development purposes
// (no concurrent user-facing copies), so the test runner can reuse the dev's key.
const localConfigPath = path.resolve(__dirname, 'local.config.json');
let localConfig: {
  foundryRootPath?: string;
  foundryE2EDataDir?: string;
  foundryE2EPort?: number;
} = {};
if (fs.existsSync(localConfigPath)) {
  try {
    localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
  } catch {
    // Silently ignore — E2E will skip if config is missing/invalid
  }
}

// Default to 31000 (not Foundry's default 30000) so the E2E runner never
// collides with a dev's locally-running Foundry instance.
const e2ePort = localConfig.foundryE2EPort ?? 31000;
const baseURL = `http://localhost:${e2ePort}`;

// Export to env so global-setup, loginAs, and other helpers can resolve the
// running Foundry without re-reading local.config.json.
process.env.FOUNDRY_E2E_BASE_URL = baseURL;
process.env.FOUNDRY_E2E_PORT = String(e2ePort);

// Defaults match scripts/setup-e2e.mjs.
const dataDir = localConfig.foundryE2EDataDir
  ?? path.resolve(__dirname, 'tests', 'e2e', '.foundry-data');
// App entrypoint is fixed under the install root.
const foundryMainJs = localConfig.foundryRootPath
  ? path.join(localConfig.foundryRootPath, 'App', 'resources', 'app', 'main.js')
  : '';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Foundry is a single shared process — serial execution prevents cross-test
  // interference. clearWorld() helper resets state between tests.
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,

  // Playwright spawns Foundry, health-checks /join, and kills on teardown.
  // setup-e2e.mjs (run in pretest:e2e) provisions the data dir Foundry boots into.
  // Set E2E_REUSE_SERVER=1 to attach to a manually-running Foundry locally
  // (e.g. when iterating on a single failing spec — saves the boot cost).
  webServer: foundryMainJs
    ? {
      command: `node "${foundryMainJs}" --dataPath="${dataDir}" --world=dnd35e-e2e --port=${e2ePort} --noupdate`,
      url: `${baseURL}/join`,
      reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    }
    : undefined,

  globalSetup: './tests/e2e/global-setup.ts',

  use: {
    baseURL,
    // Pre-authenticated as gm via global-setup. Tests that need a player view
    // override this with `test.use({ storageState: { cookies: [], origins: [] } })`.
    storageState: path.join(dataDir, '.auth.json'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
