import type { Creature } from '@actors/creature/Creature.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';
import { expect, test } from '@playwright/test';

import { clearWorld, createActor, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const ACTION_ID = 'HmeleeAttack0001';
const WARNING_ID = `action:${ACTION_ID}:formula:attackFormula`;

function diagnosticWeapon() {
  return {
    name: 'Story H diagnostic fixture',
    type: 'weapon',
    system: {
      actions: [{
        _id: ACTION_ID,
        type: 'melee_weapon_attack',
        isSystemCreated: false,
        name: { formula: 'Melee fixture', expectedType: 'string' },
        attackFormula: { formula: '', expectedType: 'rollFormula' },
        damageFormula: { formula: '1d8', expectedType: 'rollFormula' },
      }],
    },
  };
}

test.afterEach(async ({ page }) => {
  await closeAllSheets(page);
  await clearWorld(page);
});

test('GM demotes a real melee diagnostic, reloads, promotes and resets its banner preference', async ({ page }) => {
  await gotoGame(page);
  const uuid = await createItem(page, 'weapon', diagnosticWeapon());
  let sheet = page.locator(await openDocumentSheet(page, uuid));
  await expect(sheet.locator('.preparation-warnings-banner')).toBeVisible();
  await dismissOverlays(page);
  await sheet.locator('[data-tab="preparation-warnings"]').click();
  let row = sheet.locator(`[data-warning-id="${WARNING_ID}"]`);
  await expect(row).toHaveClass(/error/);
  await row.locator('summary').click();
  await row.locator('[data-banner-mode="tab"]').click();
  await expect(sheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await expect(row).toBeVisible();
  await expect.poll(() => page.evaluate(async ({ uuid, warningId }) => {
    const item = await fromUuid(uuid) as Weapon | null;
    if (!item) throw new Error('Missing fixture weapon');
    const key = encodeURIComponent(warningId).replace(/\./g, '%2E');
    return item.getFlag('dnd35e', `preparationWarningOverrides.${key}.banner`);
  }, { uuid, warningId: WARNING_ID })).toBe(false);

  await page.reload();
  await gotoGame(page);
  sheet = page.locator(await openDocumentSheet(page, uuid));
  await expect(sheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await dismissOverlays(page);
  await sheet.locator('[data-tab="preparation-warnings"]').click();
  row = sheet.locator(`[data-warning-id="${WARNING_ID}"]`);
  await expect(row).toBeVisible();

  const play = sheet.locator('.view-mode-btn').filter({ has: page.locator('i.fa-dice-d20') });
  await play.click();
  await row.locator('summary').click();
  await row.locator('[data-banner-mode="show"]').click();
  await expect(sheet.locator('.preparation-warnings-banner')).toBeVisible();
  await sheet.locator('.preparation-warnings-banner-dismiss').click();
  await expect(sheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await row.locator('summary').click();
  await row.locator('[data-banner-mode="default"]').click();
  await expect(sheet.locator('.preparation-warnings-banner')).toBeVisible();
  await expect(row).toHaveClass(/error/);
});

test('GM manages an owned melee diagnostic consistently from actor and source weapon sheets', async ({ page }) => {
  await gotoGame(page);
  const actorUuid = await createActor(page, 'character', {
    name: 'Story H actor fixture',
    items: [diagnosticWeapon()],
  });
  const itemUuid = await page.evaluate(async (uuid) => {
    const actor = await fromUuid(uuid) as Creature | null;
    const item = actor?.items.getName('Story H diagnostic fixture');
    if (!item) throw new Error('Missing embedded diagnostic fixture');
    return item.uuid;
  }, actorUuid);
  const actorSheet = page.locator(await openDocumentSheet(page, actorUuid));
  await expect(actorSheet.locator('.preparation-warnings-banner')).toBeVisible();
  await dismissOverlays(page);
  await actorSheet.locator('[data-tab="preparation-warnings"]').click();
  const actorRow = actorSheet.locator(`[data-warning-id="${WARNING_ID}"]`);
  await actorRow.locator('summary').click();
  await actorRow.locator('[data-banner-mode="tab"]').click();
  await expect(actorSheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await expect(actorRow).toBeVisible();

  const itemSheet = page.locator(await openDocumentSheet(page, itemUuid));
  await expect(itemSheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await dismissOverlays(page);
  await itemSheet.locator('[data-tab="preparation-warnings"]').click();
  const itemRow = itemSheet.locator(`[data-warning-id="${WARNING_ID}"]`);
  await itemRow.locator('summary').click();
  await itemRow.locator('[data-banner-mode="show"]').click();
  await expect(itemSheet.locator('.preparation-warnings-banner')).toBeVisible();
  await expect(actorSheet.locator('.preparation-warnings-banner')).toHaveCount(1);
});
