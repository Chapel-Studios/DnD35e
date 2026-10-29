import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { Creature } from '@actors/creature/Creature.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { Weapon } from '@items/physical/weapon/Weapon.mjs';
import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createActor, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

const ACTION_ID = 'HmeleeAttack0001';
const WARNING_ID = `action:${ACTION_ID}:formula:attackFormula`;
let packCollection: string | undefined;

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
  if (packCollection) {
    await page.evaluate(async collection => {
      const pack = game.packs.get(collection);
      if (!pack) throw new Error('Missing diagnostic fixture compendium');
      await pack.configure({ locked: false });
      await pack.deleteCompendium();
    }, packCollection);
    packCollection = undefined;
  }
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

test('GM demotes one dismissed diagnostic without reopening the other, then promotes it back', async ({ page }) => {
  await gotoGame(page);
  const fixture = diagnosticWeapon();
  fixture.system.actions[0].damageFormula.formula = '';
  const uuid = await createItem(page, 'weapon', fixture);
  const sheet = page.locator(await openDocumentSheet(page, uuid));
  await expect(sheet.locator('.preparation-warnings-banner')).toBeVisible();
  await dismissOverlays(page);
  await sheet.locator('.preparation-warnings-banner-dismiss').click();
  await expect(sheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await sheet.locator('[data-tab="preparation-warnings"]').click();
  const damageRow = sheet.locator(`[data-warning-id="action:${ACTION_ID}:formula:damageFormula"]`);
  await damageRow.locator('summary').click();
  await damageRow.locator('[data-banner-mode="tab"]').click();
  await expect.poll(() => page.evaluate(async uuid => {
    const item = await fromUuid(uuid) as Weapon | null;
    if (!item) throw new Error('Missing dismissal fixture');
    const key = encodeURIComponent('action:HmeleeAttack0001:formula:damageFormula');
    return item.getFlag('dnd35e', `preparationWarningOverrides.${key}.banner`);
  }, uuid)).toBe(false);
  await expect(sheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await expect(sheet.locator(`[data-warning-id="${WARNING_ID}"]`)).toBeVisible();
  await damageRow.locator('summary').click();
  await damageRow.locator('[data-banner-mode="show"]').click();
  await expect(sheet.locator('.preparation-warnings-banner')).toBeVisible();
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

test('GM manages an unlocked compendium diagnostic and its saved preference survives reload', async ({ page }) => {
  await gotoGame(page);
  const worldUuid = await createItem(page, 'weapon', diagnosticWeapon());
  packCollection = await page.evaluate(async () => {
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      type: 'Item', id: 'world.warning-preferences', name: 'warning-preferences',
      label: 'E2E Warning Preferences', path: 'packs/warning-preferences',
      packageName: game.world.id, packageType: 'world', system: 'dnd35e',
    });
    await pack.configure({ locked: false });
    return pack.collection;
  });
  const uuid = await page.evaluate(async ({ worldUuid, collection }) => {
    const item = await fromUuid<ItemDnd35e<'weapon', ActorDnd35e<null>>>(worldUuid);
    const pack = game.packs.get(collection);
    if (!item || !pack) throw new Error('Missing compendium import fixture');
    const imported = await pack.importDocument(item);
    if (!imported.uuid) throw new Error('Imported diagnostic fixture has no UUID');
    return imported.uuid;
  }, { worldUuid, collection: packCollection });
  let sheet = page.locator(await openDocumentSheet(page, uuid));
  await expect(sheet.locator('.preparation-warnings-banner')).toBeVisible();
  await dismissOverlays(page);
  await sheet.locator('[data-tab="preparation-warnings"]').click();
  await sheet.locator(`[data-warning-id="${WARNING_ID}"] summary`).click();
  await sheet.locator(`[data-warning-id="${WARNING_ID}"] [data-banner-mode="tab"]`).click();
  await expect(sheet.locator('.preparation-warnings-banner')).toHaveCount(0);

  await page.reload();
  await gotoGame(page);
  sheet = page.locator(await openDocumentSheet(page, uuid));
  await expect(sheet.locator('.preparation-warnings-banner')).toHaveCount(0);
  await dismissOverlays(page);
  await sheet.locator('[data-tab="preparation-warnings"]').click();
  await sheet.locator(`[data-warning-id="${WARNING_ID}"] summary`).click();
  await sheet.locator(`[data-warning-id="${WARNING_ID}"] [data-banner-mode="default"]`).click();
  await expect(sheet.locator('.preparation-warnings-banner')).toBeVisible();

  const effectUuid = await createActiveEffect(page, uuid, {
    name: 'Compendium diagnostic changes', type: 'general',
    system: { changes: ['first', 'second'].map(id => ({
      id, key: 'system.hardness', type: 'add', value: '#item.missingDiagnosticField',
      phase: 'initial', target: 'item', priority: 0,
    })) },
  });
  await closeAllSheets(page);
  const aggregateSheet = page.locator(await openDocumentSheet(page, uuid));
  await dismissOverlays(page);
  await aggregateSheet.locator('[data-tab="preparation-warnings"]').click();
  await aggregateSheet.locator(`[data-warning-id="${WARNING_ID}"] summary`).click();
  await aggregateSheet.locator(`[data-warning-id="${WARNING_ID}"] [data-banner-mode="tab"]`).click();
  const first = aggregateSheet.locator('[data-warning-id="change:first:value:formula"]');
  const second = aggregateSheet.locator('[data-warning-id="change:second:value:formula"]');
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await first.locator('summary').click();
  await first.locator('[data-banner-mode="tab"]').click();
  await expect.poll(() => page.evaluate(async effectUuid => {
    const effect = await fromUuid(effectUuid);
    if (!effect) throw new Error('Missing embedded compendium effect');
    return {
      first: effect.getFlag('dnd35e', `preparationWarningOverrides.${encodeURIComponent('change:first:value:formula')}.banner`),
      second: effect.getFlag('dnd35e', `preparationWarningOverrides.${encodeURIComponent('change:second:value:formula')}.banner`),
    };
  }, effectUuid)).toEqual({ first: false, second: undefined });
  await expect(aggregateSheet.locator('.preparation-warnings-banner')).toBeVisible();
  await second.locator('summary').click();
  await second.locator('[data-banner-mode="tab"]').click();
  await expect(aggregateSheet.locator('.preparation-warnings-banner')).toHaveCount(0);
});
