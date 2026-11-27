import { expect, test } from '@playwright/test';

import { clearWorld, createActor, updateDocument } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * E2E regression for `useAmmoStore()` ignoring `options.registerGlobally`.
 *
 * `AmmoInventoryRow.vue`'s row-scoped store is created via
 * `useAmmoStore(context, { registerGlobally: false, ... })` (see
 * `itemRowStoreRegistry.mts`'s `createItemRowStore()`) — it must NOT touch
 * `game.dnd35e.stores.Item[uuid]`, the same slot a standalone ammo sheet
 * registers itself into. Before the fix, `useAmmoStore()` unconditionally
 * registered globally regardless of the option, so opening an actor's
 * inventory (which creates a row store for the same ammo) after the ammo's
 * own standalone sheet was already open would silently overwrite that slot.
 * `ItemDnd35e._onUpdate()` then refreshed the wrong store on the next update,
 * leaving the open standalone sheet stale — not just unrefreshed, but
 * irrecoverably decoupled from further updates until manually re-rendered.
 */
test.describe('ammo store registration', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('a standalone ammo sheet stays live after an actor inventory row for the same ammo is rendered', async ({ page }) => {
    await gotoGame(page);
    const actorUuid = await createActor(page, 'character', {
      name: 'Ammo store registration fixture',
      items: [{ name: 'Arrows', type: 'ammo', system: { quantity: 1 } }],
    });
    const ammoUuid = await page.evaluate(async (uuid) => {
      const actor = await fromUuid(uuid) as Actor | null;
      const item = actor?.items.getName('Arrows');
      if (!item) throw new Error('Missing embedded ammo fixture');
      return item.uuid;
    }, actorUuid);

    // Standalone ammo sheet opens and registers itself FIRST.
    const ammoSheet = page.locator(await openDocumentSheet(page, ammoUuid));
    await dismissOverlays(page);
    const quantityInput = ammoSheet.locator('[data-field-path="system.quantity"] input');
    await expect(quantityInput).toHaveValue('1');

    // Opening the actor sheet renders this ammo as an inventory row, creating a
    // row-scoped store that must not clobber the standalone sheet's registration.
    await openDocumentSheet(page, actorUuid);

    await updateDocument(page, ammoUuid, { 'system.quantity': 5 });

    // No manual re-render - the standalone sheet's own store must still be the
    // one `ItemDnd35e._onUpdate()` refreshes.
    await expect(quantityInput).toHaveValue('5');
  });
});
