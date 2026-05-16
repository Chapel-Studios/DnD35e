import { expect, test } from '@playwright/test';

import { gotoGame } from './helpers/session.mjs';

/**
 * Layer C1 smoke spec.
 *
 * Proves the full plumbing chain works end-to-end:
 *   1. setup-e2e.mjs provisioned the data dir
 *   2. Playwright's webServer spawned Foundry on the configured port
 *   3. global-setup.ts authenticated as gm and saved storageState
 *   4. Tests load /game pre-authenticated and see a ready game
 *
 * Everything richer (player login, item creation, AE toggling) lives in
 * Layer C2+ specs.
 */
test.describe('e2e smoke', () => {
  test('gm session loads /game with game.ready and isGM === true', async ({ page }) => {
    await gotoGame(page);

    const { isGM, userName, worldId } = await page.evaluate(() => {
      const g = (globalThis as any).game;
      return {
        isGM: g.user?.isGM === true,
        userName: g.user?.name as string | undefined,
        worldId: g.world?.id as string | undefined,
      };
    });

    expect(isGM).toBe(true);
    expect(userName?.toLowerCase()).toBe('gm');
    expect(worldId).toBe('dnd35e-e2e');
  });

  test('test world ships the expected users (gm + player)', async ({ page }) => {
    await gotoGame(page);

    const userNames = await page.evaluate(() => {
      const g = (globalThis as any).game;
      return [...g.users].map((u: any) => (u.name as string).toLowerCase()).sort();
    });

    expect(userNames).toEqual(expect.arrayContaining(['gm', 'player']));
  });

  test('snapshot scene "Test Scene" exists', async ({ page }) => {
    await gotoGame(page);

    const sceneNames = await page.evaluate(() => {
      const g = (globalThis as any).game;
      return [...g.scenes].map((s: any) => s.name as string);
    });

    expect(sceneNames).toContain('Test Scene');
  });
});
