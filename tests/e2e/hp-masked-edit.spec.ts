import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet, readSheetName } from './helpers/sheets.mjs';

const MASKED_NAME = 'Masked Weapon Name';

const playButton = (page: any, sheet: string) =>
  page.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-dice-d20') });
const trueButton = (page: any, sheet: string) =>
  page.locator(`${sheet} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-eye') });

test.describe('HP masked edit (delta-mirror strategy)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('play mode shows masked name while true mode shows source name', async ({ page }) => {
    await gotoGame(page);

    const itemUuid = await createItem(page, 'weapon', {
      name: 'HP Mask Weapon',
      ownership: { default: 3 },
    });

    await createActiveEffect(page, itemUuid, {
      type: 'secret',
      name: 'Name Mask',
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

    const sheet = await openDocumentSheet(page, itemUuid);
    await playButton(page, sheet).click();
    await expect.poll(() => readSheetName(page, sheet)).toBe(MASKED_NAME);

    await trueButton(page, sheet).click();
    await expect.poll(() => readSheetName(page, sheet)).toBe('HP Mask Weapon');
  });

  test('deleting the secret mask removes true mode and restores unmasked play view', async ({ page }) => {
    await gotoGame(page);

    const itemUuid = await createItem(page, 'weapon', {
      name: 'HP Mask Remove Weapon',
      ownership: { default: 3 },
    });

    const secretUuid = await createActiveEffect(page, itemUuid, {
      type: 'secret',
      name: 'Name Mask',
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

    const sheet = await openDocumentSheet(page, itemUuid);
    await expect(trueButton(page, sheet)).toHaveCount(1);

    await playButton(page, sheet).click();
    await expect.poll(() => readSheetName(page, sheet)).toBe(MASKED_NAME);

    await page.evaluate(async (uuid) => {
      const ae = await (globalThis as any).fromUuid(uuid);
      await ae.delete();
    }, secretUuid);

    await expect.poll(() => trueButton(page, sheet).count()).toBe(0);
    await expect.poll(() => readSheetName(page, sheet)).toBe('HP Mask Remove Weapon');
  });
});
