import type { BrowserContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createItem } from './helpers/documents.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';

test.describe('forceEdit in play mode', () => {
  let playerContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  });

  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
    await playerContext.close();
  });

  test('GM can switch between edit and play surfaces on weapon sheet', async ({ page }) => {
    await gotoGame(page);

    const itemUuid = await createItem(page, 'weapon', {
      name: 'ForceEdit GM Weapon',
      ownership: { default: 3 },
    });

    const sheet = await openDocumentSheet(page, itemUuid);
    const playBtn = page.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-dice-d20') });
    const editBtn = page.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-pen-to-square') });

    await expect(page.locator(`${sheet} .name-formula-inline .formula-input`)).toHaveCount(1);
    await expect(page.locator(`${sheet} .name-field .item-name`)).toHaveCount(0);

    await playBtn.click();
    await expect(page.locator(`${sheet} .name-formula-inline .formula-input`)).toHaveCount(0);
    await expect(page.locator(`${sheet} .name-field .item-name`)).toHaveCount(1);

    await editBtn.click();
    await expect(page.locator(`${sheet} .name-formula-inline .formula-input`)).toHaveCount(1);
  });

  test('Player OWNER sees edit and play buttons, but not true mode', async ({ page }) => {
    await gotoGame(page);

    const itemUuid = await createItem(page, 'weapon', {
      name: 'ForceEdit Player Weapon',
      ownership: { default: 3 },
    });

    const playerPage = await loginAs(playerContext, 'player');
    const sheet = await openDocumentSheet(playerPage, itemUuid);

    await expect(
      playerPage.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: playerPage.locator('i.fa-pen-to-square') })
    ).toHaveCount(1);
    await expect(
      playerPage.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: playerPage.locator('i.fa-dice-d20') })
    ).toHaveCount(1);
    await expect(
      playerPage.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: playerPage.locator('i.fa-eye') })
    ).toHaveCount(0);
  });
});
