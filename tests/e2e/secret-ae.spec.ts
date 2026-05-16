import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createItem } from './helpers/documents.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet, readSheetName, rerenderSheet } from './helpers/sheets.mjs';

/**
 * Round-trip masking E2E for Secret Active Effects.
 *
 * GM creates a weapon, attaches one or more Secret AEs that mask the item's
 * `name`, and we verify the rendered sheet header reflects the correct value
 * for each viewer / view mode.
 *
 * View mode buttons live in `.view-mode-bar .view-mode-btn`.
 */

const REAL_NAME = 'Real Longsword';
const MASKED_NAME = 'Mysterious Sword';
const ALT_MASKED_NAME = 'Cursed Blade';

interface PreparedWeapon {
  itemUuid: string;
}

/** Create a weapon visible to all players. */
async function createMaskableWeapon (page: Page): Promise<PreparedWeapon> {
  const itemUuid = await createItem(page, 'weapon', {
    name: REAL_NAME,
    // OBSERVER permission for all players so the player context can open the sheet.
    ownership: { default: 2 },
  });
  return { itemUuid };
}

test.describe('secret AE masking round-trip', () => {
  let playerContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // Player context starts unauthenticated and logs in via /join.
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  });

  test.afterEach(async ({ page }) => {
    // Close anything still open in the GM context to avoid cross-test bleed.
    await closeAllSheets(page).catch(() => {});
    // Drop world documents so the next test starts from the snapshot baseline.
    await clearWorld(page);
    await playerContext.close();
  });

  test('player sees masked name; toggling Secret disabled restores real name', async ({ page }) => {
    await gotoGame(page);
    const { itemUuid } = await createMaskableWeapon(page);

    const secretUuid = await createActiveEffect(page, itemUuid, {
      name: 'Mask Name',
      type: 'secret',
      img: 'icons/svg/eye.svg',
      disabled: false,
      changes: [{
        key: 'name',
        value: MASKED_NAME,
        type: 'mask',
        target: 'item',
        priority: 10,
        phase: 'core',
      }],
    });

    // Player logs in to a fresh browser context and opens the same item sheet.
    const playerPage = await loginAs(playerContext, 'player');
    const playerSheet = await openDocumentSheet(playerPage, itemUuid);
    expect(await readSheetName(playerPage, playerSheet)).toBe(MASKED_NAME);

    // GM disables the Secret AE. Player sheet should re-render with the real name.
    await page.evaluate(async (uuid) => {
      const ae = await (globalThis as any).fromUuid(uuid);
      await ae.update({ disabled: true });
    }, secretUuid);

    await rerenderSheet(playerPage, itemUuid);
    await expect.poll(() => readSheetName(playerPage, playerSheet)).toBe(REAL_NAME);
  });

  test('GM view-mode toggle: play shows masked, true shows real', async ({ page }) => {
    await gotoGame(page);
    const { itemUuid } = await createMaskableWeapon(page);

    await createActiveEffect(page, itemUuid, {
      name: 'Mask Name',
      type: 'secret',
      img: 'icons/svg/eye.svg',
      disabled: false,
      changes: [{
        key: 'name',
        value: MASKED_NAME,
        type: 'mask',
        target: 'item',
        priority: 10,
        phase: 'core',
      }],
    });

    const sheetSelector = await openDocumentSheet(page, itemUuid);

    const sheet = page.locator(sheetSelector);
    const playBtn = sheet.locator('.view-mode-bar .view-mode-btn').filter({ has: page.locator('i.fa-dice-d20') });
    const trueBtn = sheet.locator('.view-mode-bar .view-mode-btn').filter({ has: page.locator('i.fa-eye') });

    await playBtn.click();
    await expect.poll(() => readSheetName(page, sheetSelector)).toBe(MASKED_NAME);

    await trueBtn.click();
    await expect.poll(() => readSheetName(page, sheetSelector)).toBe(REAL_NAME);
  });

  test('multiple Secret AEs: highest-priority mask wins for the player view', async ({ page }) => {
    await gotoGame(page);
    const { itemUuid } = await createMaskableWeapon(page);

    // Low-priority mask first.
    await createActiveEffect(page, itemUuid, {
      name: 'Low Priority Mask',
      type: 'secret',
      img: 'icons/svg/eye.svg',
      disabled: false,
      changes: [{
        key: 'name',
        value: MASKED_NAME,
        type: 'mask',
        target: 'item',
        priority: 10,
        phase: 'core',
      }],
    });

    // High-priority mask should override.
    await createActiveEffect(page, itemUuid, {
      name: 'High Priority Mask',
      type: 'secret',
      img: 'icons/svg/eye.svg',
      disabled: false,
      changes: [{
        key: 'name',
        value: ALT_MASKED_NAME,
        type: 'mask',
        target: 'item',
        priority: 100,
        phase: 'core',
      }],
    });

    const playerPage = await loginAs(playerContext, 'player');
    const playerSheet = await openDocumentSheet(playerPage, itemUuid);
    expect(await readSheetName(playerPage, playerSheet)).toBe(ALT_MASKED_NAME);
  });
});
