import { expect, test } from '@playwright/test';

import { clearWorld, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, dismissOverlays, openDocumentSheet } from './helpers/sheets.mjs';

/**
 * E2E test for equip/unequip toggle on actor inventory items.
 *
 * Verifies that:
 * 1. An equippable item (weapon) starts unequipped (isEquipped = false)
 * 2. Clicking the equip toggle changes isEquipped to true
 * 3. The UI reflects equipped state (visual indicator or row styling)
 * 4. Toggling again unequips it
 *
 * Tests the full path: InventoryItemRow equip button → item.update({isEquipped}) →
 * actor.prepareData() re-runs with live virtual-changes from EquippableItem.getContributedActorChanges()
 */

test.describe('equip/unequip toggle', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('actor inventory: equip and unequip weapon from inventory row', async ({ page }) => {
    await gotoGame(page);

    // Create actor with a weapon item
    const { actorUuid, weaponUuid } = await page.evaluate(
      async () => {
        const actor = await (globalThis as any).Actor.create({
          type: 'character',
          name: 'Test Actor',
          system: { abilities: { str: { score: 10 } } },
        });

        const weapon = (await actor.createEmbeddedDocuments('Item', [
          {
            type: 'weapon',
            name: 'Longsword',
            system: {
              weight: 4,
              quantity: 1,
              price: { stacks: [{ coinId: 'srd_gp', count: 15 }], srdEquivalent: 15 },
              isEquipped: false, // Start unequipped
            },
          },
        ]))[0];

        return {
          actorUuid: actor.uuid,
          weaponUuid: weapon.uuid,
        };
      }
    );

    // Open actor inventory sheet
    const sheet = await openDocumentSheet(page, actorUuid);
    await dismissOverlays(page);

    // Find the weapon row in the inventory table
    const weaponRow = page.locator(`${sheet} table tbody tr`).filter({ hasText: 'Longsword' });
    expect(weaponRow).toBeDefined();

    // Weapon should start unequipped (no visual indicator or disabled state)
    const initialEquipButton = weaponRow.locator('[data-equip-toggle]');
    const initialEquipped = await initialEquipButton.evaluate((el) =>
      el.classList.contains('is-active')
    );
    expect(initialEquipped).toBe(false);

    // Click equip button to toggle on
    await initialEquipButton.click();
    await page.waitForLoadState('networkidle');

    // Verify weapon is now equipped (visual indicator active)
    const equippedAfterClick = await initialEquipButton.evaluate((el) =>
      el.classList.contains('is-active')
    );
    expect(equippedAfterClick).toBe(true);

    // Verify backend: weapon item should have isEquipped = true
    const equippedState = await page.evaluate(
      (uuid) => (globalThis as any).fromUuid(uuid).then((item: any) => item.system.isEquipped),
      weaponUuid
    );
    expect(equippedState).toBe(true);

    // Click equip button again to toggle off
    const toggleButton = weaponRow.locator('[data-equip-toggle]');
    await toggleButton.click();
    await page.waitForLoadState('networkidle');

    // Verify weapon is unequipped again
    const unequippedAfterSecondClick = await toggleButton.evaluate((el) =>
      el.classList.contains('is-active')
    );
    expect(unequippedAfterSecondClick).toBe(false);

    // Verify backend: weapon item should have isEquipped = false
    const unequippedState = await page.evaluate(
      (uuid) => (globalThis as any).fromUuid(uuid).then((item: any) => item.system.isEquipped),
      weaponUuid
    );
    expect(unequippedState).toBe(false);
  });
});
