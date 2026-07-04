import type { BrowserContext, Page } from '@playwright/test';

import { closePlayerConfigIfOpen } from './ui.mjs';

export type FoundryRole = 'gm' | 'player';

const DEFAULT_FOUNDRY_E2E_BASE_URL = 'http://localhost:31000';

function resolveBaseUrl (baseUrl?: string): string {
  return baseUrl ?? process.env.FOUNDRY_E2E_BASE_URL ?? DEFAULT_FOUNDRY_E2E_BASE_URL;
}

function isConnectionRefusedError (error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('ERR_CONNECTION_REFUSED') || message.includes('ECONNREFUSED');
}

async function gotoWithRetry (page: Page, url: string, maxAttempts = 8): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      lastError = error;
      if (!isConnectionRefusedError(error) || attempt === maxAttempts) {
        throw error;
      }
      // Foundry can still be booting between worker startup and first test navigation.
      await page.waitForTimeout(500 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to navigate to ${url}`);
}

/**
 * Drive Foundry's `/join` SPA: select the user by name from the dropdown,
 * submit, wait for `/game` and `game.ready === true`.
 *
 * Used by both `global-setup` (GM session → storageState) and `loginAs`
 * (per-test player sessions). Centralises the SPA-aware selector logic.
 */
export async function performJoin (page: Page, baseUrl: string, userName: string): Promise<void> {
  await gotoWithRetry(page, `${baseUrl}/join`);

  await page.waitForSelector('select[name="userid"]', { timeout: 30_000 });

  const userRegex = new RegExp(`^${userName}$`, 'i');
  const option = page.locator('select[name="userid"] option').filter({ hasText: userRegex });
  const value = await option.getAttribute('value');
  if (!value) {
    throw new Error(`[joinFlow] Could not find user "${userName}" in /join dropdown. Check the snapshot users.`);
  }

  await page.selectOption('select[name="userid"]', value);
  await page.click('button[name="join"]');

  await page.waitForURL(`${baseUrl}/game`, { timeout: 30_000 });
  await page.waitForFunction(
    () => typeof (globalThis as any).game !== 'undefined' && (globalThis as any).game.ready === true,
    null,
    { timeout: 30_000 }
  );
}

/**
 * Logs the given browser context in to Foundry as the named role and returns
 * the authenticated Page (already on /game with `game.ready === true`).
 *
 * The context should be created with `storageState: undefined` so it starts
 * unauthenticated. Tests that only need a GM session can reuse the
 * globalSetup-saved storageState and skip this helper.
 */
export async function loginAs (context: BrowserContext, role: FoundryRole): Promise<Page> {
  const baseUrl = resolveBaseUrl();
  const page = await context.newPage();
  await performJoin(page, baseUrl, role);
  // A freshly-joined player with no assigned character gets an auto-opened
  // UserConfig dialog that intercepts sheet clicks; close it before returning
  // so every player-context spec starts from a clean, interactable state.
  if (role === 'player') {
    await closePlayerConfigIfOpen(page);
  }
  return page;
}

/**
 * Navigate to /game and wait until Foundry's `game.ready === true`.
 *
 * Use as the first line of any test that needs an interactive game session.
 * Relies on the storageState saved by `global-setup.ts` to bypass /join.
 */
export async function gotoGame (page: Page, baseUrl?: string): Promise<void> {
  const target = resolveBaseUrl(baseUrl);
  await gotoWithRetry(page, `${target}/game`);
  await page.waitForFunction(
    () => typeof (globalThis as any).game !== 'undefined' && (globalThis as any).game.ready === true,
    null,
    { timeout: 30_000 }
  );
}
