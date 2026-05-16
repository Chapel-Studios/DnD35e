import type { Page } from '@playwright/test';

/**
 * Navigate to /game and wait until Foundry's `game.ready === true`.
 *
 * Use as the first line of any test that needs an interactive game session.
 * Relies on the storageState saved by `global-setup.ts` to bypass /join.
 */
export async function gotoGame (page: Page, baseUrl?: string): Promise<void> {
  const target = baseUrl ?? '';
  await page.goto(`${target}/game`);
  await page.waitForFunction(
    () => typeof (globalThis as any).game !== 'undefined' && (globalThis as any).game.ready === true,
    null,
    { timeout: 30_000 }
  );
}
