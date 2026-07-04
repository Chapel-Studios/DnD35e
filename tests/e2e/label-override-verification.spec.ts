import { expect, test } from '@playwright/test';

import { clearWorld, createActor, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';

const openTab = async (page: any, sheet: string, tab: string) => {
  const tabLink = page.locator(`${sheet} nav.sheet-tabs a[data-tab="${tab}"]`).first();
  if (await tabLink.count()) await tabLink.click();
};

test.describe('Label override verification', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('Ability score rows display abbreviated labels', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', { name: 'Abbreviation Test' });
    const sheet = await openDocumentSheet(page, actorUuid);

    const strGroup = page.locator(`${sheet} .form-group[data-field-path="system.abilities.str.score"]`).first();

    await expect(strGroup).toBeVisible();
    await expect(strGroup.locator('.form-group-label')).toContainText(/STR/i);
  });

  test('Notes tab renders system.notes label', async ({ page }) => {
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', { name: 'Notes Label Test' });
    const sheet = await openDocumentSheet(page, actorUuid);

    await openTab(page, sheet, 'notes');

    await expect(
      page.locator(`${sheet} .form-group[data-field-path="system.notes"] .form-group-label`).first()
    ).toBeVisible();
  });

  test('Item size field renders on weapon sheet', async ({ page }) => {
    await gotoGame(page);

    const itemUuid = await createItem(page, 'weapon', { name: 'Size Label Test Weapon' });
    const sheet = await openDocumentSheet(page, itemUuid);

    await openTab(page, sheet, 'details');

    await expect(page.locator(`${sheet} [data-field-path="system.size"] select`).first()).toBeVisible();
  });
});
