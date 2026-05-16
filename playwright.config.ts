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
  foundryLicenseKey?: string;
  foundryAppPath?: string;
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

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // webServer is configured per-spec via the withTestWorld fixture once a
  // license + Foundry app path are wired in. Story 1 ships the scaffold only.
});
