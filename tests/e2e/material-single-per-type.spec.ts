import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { setSystemSetting } from './helpers/setSystemSetting.mjs';
import { closeAllSheets } from './helpers/sheets.mjs';

/**
 * End-to-end: ENFORCE_SINGLE_MATERIAL setting gates Material AEs by subtype.
 *
 * `validateSingleMaterial` is wired into the `preCreateActiveEffect` hook and
 * blocks a second Material AE of the same subtype on the same parent when the
 * setting is on. With the setting off, multiple Materials of any subtype are
 * allowed to coexist. Subtypes (`standard`, `broken`, `masterwork`) are
 * evaluated independently — a parent may carry at most one of each.
 *
 * The setting key is `enforceSingleMaterial` under the `dnd35e` namespace
 * (`COMBAT_KEYS.ENFORCE_SINGLE_MATERIAL`).
 */

const SETTING_KEY = 'enforceSingleMaterial';

interface MaterialSeed {
  name: string;
  subtype: 'standard' | 'broken' | 'masterwork';
}

async function addMaterial (page: Page, itemUuid: string, seed: MaterialSeed): Promise<string | null> {
  return await page.evaluate(async ({ itemUuid, seed }) => {
    const item = await (globalThis as any).fromUuid(itemUuid);
    if (!item) throw new Error(`addMaterial: parent not found at ${itemUuid}`);
    const created = await item.createEmbeddedDocuments('ActiveEffect', [{
      name: seed.name,
      type: 'material',
      img: 'icons/svg/anchor.svg',
      disabled: false,
      system: { materialSubtype: seed.subtype },
    }]);
    return created?.[0]?.uuid ?? null;
  }, { itemUuid, seed });
}

async function countMaterials (page: Page, itemUuid: string): Promise<number> {
  return await page.evaluate(async (uuid) => {
    const item = await (globalThis as any).fromUuid(uuid);
    return [...(item.effects ?? [])].filter((e: any) => e.type === 'material').length;
  }, itemUuid);
}

test.describe('ENFORCE_SINGLE_MATERIAL setting', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
    // Restore default (off) so cross-test bleed is impossible.
    await setSystemSetting(page, SETTING_KEY, false);
  });

  test('setting off → two standard Materials are allowed to coexist', async ({ page }) => {
    await gotoGame(page);
    await setSystemSetting(page, SETTING_KEY, false);

    const itemUuid = await createItem(page, 'weapon', { name: 'Multi-Material Sword' });
    const firstUuid = await addMaterial(page, itemUuid, { name: 'Steel', subtype: 'standard' });
    const secondUuid = await addMaterial(page, itemUuid, { name: 'Adamantine', subtype: 'standard' });

    expect(firstUuid).not.toBeNull();
    expect(secondUuid).not.toBeNull();
    expect(await countMaterials(page, itemUuid)).toBe(2);
  });

  test('setting on → second standard Material is rejected; the first remains', async ({ page }) => {
    await gotoGame(page);
    await setSystemSetting(page, SETTING_KEY, true);

    const itemUuid = await createItem(page, 'weapon', { name: 'Single-Material Sword' });
    const firstUuid = await addMaterial(page, itemUuid, { name: 'Steel', subtype: 'standard' });
    expect(firstUuid).not.toBeNull();

    // The pre-create hook should veto the second standard Material.
    const secondUuid = await addMaterial(page, itemUuid, { name: 'Adamantine', subtype: 'standard' });
    expect(secondUuid).toBeNull();

    // Only the first Material remains on the parent.
    expect(await countMaterials(page, itemUuid)).toBe(1);
  });

  test('setting on → one of each subtype is allowed; duplicate of any subtype is blocked', async ({ page }) => {
    await gotoGame(page);
    await setSystemSetting(page, SETTING_KEY, true);

    const itemUuid = await createItem(page, 'weapon', { name: 'Three-Subtype Sword' });

    // One of each subtype: all three should land.
    const standardUuid = await addMaterial(page, itemUuid, { name: 'Steel', subtype: 'standard' });
    const brokenUuid = await addMaterial(page, itemUuid, { name: 'Broken', subtype: 'broken' });
    const masterworkUuid = await addMaterial(page, itemUuid, { name: 'Masterwork', subtype: 'masterwork' });
    expect(standardUuid).not.toBeNull();
    expect(brokenUuid).not.toBeNull();
    expect(masterworkUuid).not.toBeNull();
    expect(await countMaterials(page, itemUuid)).toBe(3);

    // Duplicates of any subtype should be vetoed by the pre-create hook.
    const dupBroken = await addMaterial(page, itemUuid, { name: 'Broken Again', subtype: 'broken' });
    const dupMasterwork = await addMaterial(page, itemUuid, { name: 'Masterwork Again', subtype: 'masterwork' });
    expect(dupBroken).toBeNull();
    expect(dupMasterwork).toBeNull();
    expect(await countMaterials(page, itemUuid)).toBe(3);
  });
});
