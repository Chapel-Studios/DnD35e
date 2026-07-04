import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createItem } from './helpers/documents.mjs';
import { clearFieldOverride, setFieldOverride, waitForFieldOverride } from './helpers/fieldOverrides.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet, rerenderSheet } from './helpers/sheets.mjs';
import { closePlayerConfigIfOpen, dismissOverlays } from './helpers/ui.mjs';

/**
 * Field-permissions round-trip E2E.
 *
 * GM sets a per-field visibility / editability override on a weapon's
 * `system.quantity` field (rendered on every PhysicalItem sheet via
 * `ItemQuantity`). A second player session asserts the override is honoured
 * end-to-end, then we clear it and assert the field returns to defaults.
 *
 * `system.quantity` is the target because it lives on PhysicalItem (present
 * on every physical sheet) and its FormGroup is `everyoneVisibility` /
 * `normalEditability` by default. Form groups carry a `data-field-path`
 * attribute so they can be located independent of view mode.
 *
 * Player gets OWNER (3) so they have edit permission; they then switch to
 * `edit` view mode via the `fa-pen-to-square` button so the input renders.
 *
 * The merge / cascade logic itself is exhaustively covered by the
 * `field-override-cascade` unit tests; this spec only exercises the
 * end-to-end wiring through real Foundry documents, flag storage, sheet
 * re-rendering, and per-user visibility.
 */

const FIELD_PATH = 'system.quantity';

const quantityFormGroup = (page: Page, sheetSelector: string) =>
  page.locator(`${sheetSelector} .form-group[data-field-path="${FIELD_PATH}"]`);

const quantityInput = (page: Page, sheetSelector: string) =>
  quantityFormGroup(page, sheetSelector).locator('input[type="number"]');

/**
 * Click the edit-mode button (`fa-pen-to-square` icon) in the sheet's
 * view-mode bar. The bar is rendered by `RenderModeStore.renderViewModeBar`
 * directly into the AppV2 window header.
 */
async function switchToEditMode (page: Page, sheetSelector: string): Promise<void> {
  const editBtn = page.locator(`${sheetSelector} .view-mode-bar .view-mode-btn`).filter({ has: page.locator('i.fa-pen-to-square') });
  await dismissOverlays(page);
  await expect(editBtn).toBeVisible();
  if (await editBtn.evaluate((el) => el.classList.contains('active'))) return;
  // dispatchEvent instead of click(): the toggle handler is a plain @click, and
  // under heavy canvas load Playwright's actionability "stable" gate can hang
  // indefinitely on the jittering view-mode bar. dispatchEvent sidesteps both
  // the stability check and any residual overlay interception.
  await editBtn.dispatchEvent('click');
  await expect(editBtn).toHaveClass(/active/);
}

/** Create a baseline weapon; player ownership is granted separately via grantPlayerOwner. */
async function createOwnedWeapon (page: Page): Promise<string> {
  return await createItem(page, 'weapon', {
    name: 'Permission Test Sword',
    system: { quantity: 1 },
    ownership: { default: 0 },
  });
}

async function grantPlayerOwner (page: Page, itemUuid: string): Promise<void> {
  await page.evaluate(async (uuid) => {
    const doc = await (globalThis as any).fromUuid(uuid);
    const player = (globalThis as any).game?.users?.find((u: any) => String(u?.name).toLowerCase() === 'player');
    if (!doc || !player?.id) throw new Error('grantPlayerOwner: missing doc or player');
    await doc.update({ ownership: { ...doc.ownership, default: 0, [player.id]: 3 } });
  }, itemUuid);
}

// These tests are sadly flakey and need to be run separately. 
// TODO: investigate and fix the flakiness, then re-enable them to run in parallel with other e2e tests.
test.describe('field-permissions round-trip', () => {
  let playerContext: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  });

  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
    await playerContext.close();
  });

  test('gmOnly visibility hides the field from a player; clearing restores it', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createOwnedWeapon(page);
    await grantPlayerOwner(page, itemUuid);

    // Baseline: player sees the quantity form-group rendered (play mode is fine).
    const playerPage = await loginAs(playerContext, 'player');
    await closePlayerConfigIfOpen(playerPage);
    await dismissOverlays(playerPage);
    const playerSheet = await openDocumentSheet(playerPage, itemUuid);
    await expect(quantityFormGroup(playerPage, playerSheet)).toBeVisible();

    // GM applies gmOnly visibility; the form-group should become hidden.
    await setFieldOverride(page, itemUuid, FIELD_PATH, 'visibility', 'gmOnly');
    await rerenderSheet(playerPage, itemUuid);
    await expect.poll(() => quantityFormGroup(playerPage, playerSheet).isHidden()).toBe(true);

    // Clear the override; the field returns.
    await clearFieldOverride(page, itemUuid, FIELD_PATH, 'visibility');
    await rerenderSheet(playerPage, itemUuid);
    await expect.poll(() => quantityFormGroup(playerPage, playerSheet).isVisible()).toBe(true);
  });

  test('gmOnly editability makes the field read-only for a player; clearing restores edit', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createOwnedWeapon(page);
    await grantPlayerOwner(page, itemUuid);

    // Player needs edit mode to see the input (non-GM defaults to play mode).
    const playerPage = await loginAs(playerContext, 'player');
    await closePlayerConfigIfOpen(playerPage);
    await dismissOverlays(playerPage);
    await expect.poll(async () => {
      return playerPage.evaluate(async (uuid) => {
        const doc = await (globalThis as any).fromUuid(uuid);
        return !!doc?.testUserPermission((globalThis as any).game.user, 'OWNER');
      }, itemUuid);
    }).toBe(true);
    const playerSheet = await openDocumentSheet(playerPage, itemUuid);
    await switchToEditMode(playerPage, playerSheet);

    // Baseline: editable number input is rendered.
    await expect(quantityInput(playerPage, playerSheet)).toBeVisible();

    // GM applies gmOnly editability; FormGroup switches to the readonly slot.
    await setFieldOverride(page, itemUuid, FIELD_PATH, 'editability', 'gmOnly');
    await waitForFieldOverride(playerPage, itemUuid, FIELD_PATH, 'editability', 'gmOnly');
    await rerenderSheet(playerPage, itemUuid);
    await switchToEditMode(playerPage, playerSheet).catch(() => {});
    await expect.poll(() => quantityInput(playerPage, playerSheet).count()).toBe(0);
    await expect(quantityFormGroup(playerPage, playerSheet)).toBeVisible();

    // Clear the override; the input comes back (edit mode is preserved).
    await clearFieldOverride(page, itemUuid, FIELD_PATH, 'editability');
    await waitForFieldOverride(playerPage, itemUuid, FIELD_PATH, 'editability', null);
    await rerenderSheet(playerPage, itemUuid);
    await switchToEditMode(playerPage, playerSheet).catch(() => {});
    await expect.poll(async () => {
      if (playerPage.isClosed()) return -1;
      return quantityInput(playerPage, playerSheet).count();
    }).toBe(1);
  });
});
