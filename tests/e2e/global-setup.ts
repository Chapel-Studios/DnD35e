/**
 * Playwright global setup — runs once before any test.
 *
 * Foundry has already been started by the `webServer` block in
 * `playwright.config.ts`. This script:
 *
 *   1. Logs in to the test world as the `gm` user.
 *   2. Waits for `game.ready === true`.
 *   3. Saves the authenticated browser state to `<dataDir>/.auth.json` so
 *      every test starts pre-authenticated as GM (via `storageState`).
 *
 * Tests that need a player view spin up a fresh browser context with
 * `storageState: undefined` and call `loginAs(page, 'player')`.
 *
 * Pattern lifted with permission from D35E's `test/e2e/global-setup.js`.
 */

import { chromium } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readLocalConfig (): {
  foundryE2EDataDir?: string;
  foundryE2EPort?: number;
  } {
  const p = path.join(REPO_ROOT, 'local.config.json');
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

export default async function globalSetup (): Promise<void> {
  const config = readLocalConfig();
  const dataDir = config.foundryE2EDataDir
    ?? path.join(REPO_ROOT, 'tests', 'e2e', '.foundry-data');
  const port = config.foundryE2EPort ?? 31000;
  const baseUrl = `http://localhost:${port}`;

  console.log('[global-setup] Logging in as gm…');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/join`);

  // Wait for the SPA-rendered join form before querying it.
  await page.waitForSelector('select[name="userid"]', { timeout: 30_000 });

  // Select the gm user (passwords are blank in the snapshot).
  const gmOption = page.locator('select[name="userid"] option').filter({ hasText: /^gm$/i });
  const gmValue = await gmOption.getAttribute('value');
  if (!gmValue) {
    throw new Error('[global-setup] Could not find gm user in /join dropdown. Check the snapshot users.');
  }
  await page.selectOption('select[name="userid"]', gmValue);
  await page.click('button[name="join"]');

  await page.waitForURL(`${baseUrl}/game`, { timeout: 30_000 });
  await page.waitForFunction(
    () => typeof (globalThis as any).game !== 'undefined' && (globalThis as any).game.ready === true,
    null,
    { timeout: 30_000 }
  );

  const authPath = path.join(dataDir, '.auth.json');
  await page.context().storageState({ path: authPath });
  console.log(`[global-setup] Auth state saved to ${authPath}`);

  await browser.close();
}
