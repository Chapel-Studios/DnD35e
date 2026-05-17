import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createItem } from './helpers/documents.mjs';
import { gotoGame, loginAs } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet, rerenderSheet } from './helpers/sheets.mjs';

/**
 * Structural E2E for the cross-cutting view-mode bar.
 *
 * Covers the visibility matrix (GM vs player, with/without secrets, owner
 * vs observer), active-state semantics, transition gating, and the
 * `HeaderNameField` DOM swap between edit and non-edit modes.
 *
 * Value-correctness across modes (masked play vs unmasked true) is owned
 * by `secret-ae.spec.ts`. This spec only proves the bar's structural
 * contract: which buttons render, which carries `.active`, and that
 * mode transitions actually mount/unmount the header surfaces.
 */

const OBSERVER = 2;
const OWNER = 3;

interface ButtonLocators {
  bar: ReturnType<Page['locator']>;
  edit: ReturnType<Page['locator']>;
  play: ReturnType<Page['locator']>;
  true: ReturnType<Page['locator']>;
}

/** Bar-button locators scoped to a specific sheet element. */
function modeButtons (page: Page, sheetSelector: string): ButtonLocators {
  const sheet = page.locator(sheetSelector);
  const bar = sheet.locator('.view-mode-bar');
  return {
    bar,
    edit: bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-pen-to-square') }),
    play: bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-dice-d20') }),
    true: bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-eye') }),
  };
}

async function createWeapon (page: Page, ownership: number, name = 'Mode Bar Sword'): Promise<string> {
  return createItem(page, 'weapon', {
    name,
    ownership: { default: ownership },
  });
}

async function attachNameMask (page: Page, itemUuid: string, masked = 'Hidden Sword'): Promise<string> {
  return createActiveEffect(page, itemUuid, {
    name: 'Mask Name',
    type: 'secret',
    img: 'icons/svg/eye.svg',
    disabled: false,
    changes: [{
      key: 'name',
      value: masked,
      type: 'mask',
      target: 'item',
      priority: 10,
      phase: 'core',
    }],
  });
}

test.describe('view-mode bar', () => {
  let playerContext: BrowserContext | null = null;

  test.beforeEach(async ({ browser }) => {
    playerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  });

  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
    if (playerContext) {
      await playerContext.close().catch(() => {});
      playerContext = null;
    }
  });

  test('GM without secrets sees Edit + Play; True is absent', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createWeapon(page, OBSERVER);
    const sheet = await openDocumentSheet(page, uuid);

    const btns = modeButtons(page, sheet);
    await expect(btns.bar).toBeVisible();
    await expect(btns.edit).toHaveCount(1);
    await expect(btns.play).toHaveCount(1);
    await expect(btns.true).toHaveCount(0);
  });

  test('GM with Secret AE sees all three; sheet re-render after Secret deletion hides True', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createWeapon(page, OBSERVER);
    const secretUuid = await attachNameMask(page, uuid);
    const sheet = await openDocumentSheet(page, uuid);

    const btns = modeButtons(page, sheet);
    await expect(btns.edit).toHaveCount(1);
    await expect(btns.play).toHaveCount(1);
    await expect(btns.true).toHaveCount(1);

    // Delete the Secret AE. Note: disabling alone is not enough — the
    // bar's `hasSecrets` check (in `_onRender`) tests
    // `effects.some(e => e.type === 'secret')`, which counts disabled
    // Secret AEs too. The True button stays available so a GM can
    // re-enable. Deletion is the genuine "no more secrets" condition.
    // Also: `hasSecrets` is sampled on full sheet render, not via Vue
    // reactivity, so we force a re-render to surface the change.
    await page.evaluate(async (aeUuid) => {
      const ae = await (globalThis as any).fromUuid(aeUuid);
      await ae.delete();
    }, secretUuid);
    await rerenderSheet(page, uuid);

    await expect.poll(() => btns.true.count()).toBe(0);
    await expect(btns.edit).toHaveCount(1);
    await expect(btns.play).toHaveCount(1);
  });

  test('Player with OWNER permission sees Edit + Play; True is absent even with a Secret AE', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createWeapon(page, OWNER);
    await attachNameMask(page, uuid);

    const playerPage = await loginAs(playerContext!, 'player');
    const playerSheet = await openDocumentSheet(playerPage, uuid);

    const btns = modeButtons(playerPage, playerSheet);
    await expect(btns.bar).toBeVisible();
    await expect(btns.edit).toHaveCount(1);
    await expect(btns.play).toHaveCount(1);
    await expect(btns.true).toHaveCount(0);
  });

  test('Player with OBSERVER permission sees Play only; Edit and True absent', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createWeapon(page, OBSERVER);
    await attachNameMask(page, uuid);

    const playerPage = await loginAs(playerContext!, 'player');
    const playerSheet = await openDocumentSheet(playerPage, uuid);

    const btns = modeButtons(playerPage, playerSheet);
    await expect(btns.bar).toBeVisible();
    await expect(btns.play).toHaveCount(1);
    await expect(btns.edit).toHaveCount(0);
    await expect(btns.true).toHaveCount(0);
  });

  test('Active class follows the current mode as the user clicks buttons', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createWeapon(page, OBSERVER);
    await attachNameMask(page, uuid);
    const sheet = await openDocumentSheet(page, uuid);

    const btns = modeButtons(page, sheet);

    // GM initial mode is EDIT (per VueDocumentSheetMixin role-based default).
    await expect(btns.edit).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(btns.play).not.toHaveClass(/(^|\s)active(\s|$)/);
    await expect(btns.true).not.toHaveClass(/(^|\s)active(\s|$)/);

    await btns.play.click();
    await expect(btns.play).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(btns.edit).not.toHaveClass(/(^|\s)active(\s|$)/);

    await btns.true.click();
    await expect(btns.true).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(btns.play).not.toHaveClass(/(^|\s)active(\s|$)/);

    await btns.edit.click();
    await expect(btns.edit).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(btns.true).not.toHaveClass(/(^|\s)active(\s|$)/);
  });

  test('HeaderNameField swaps between FormulaFormGroup (edit) and DocumentName (play/true)', async ({ page }) => {
    await gotoGame(page);
    const uuid = await createWeapon(page, OBSERVER);
    await attachNameMask(page, uuid);
    const sheet = await openDocumentSheet(page, uuid);

    const sheetEl = page.locator(sheet);
    const formulaInput = sheetEl.locator('.name-formula-inline .formula-input');
    const documentName = sheetEl.locator('.name-field .item-name');
    const btns = modeButtons(page, sheet);

    // GM starts in EDIT: formula input is mounted, .item-name is not.
    await expect(formulaInput).toHaveCount(1);
    await expect(documentName).toHaveCount(0);

    // Switch to PLAY: swap reverses.
    await btns.play.click();
    await expect(formulaInput).toHaveCount(0);
    await expect(documentName).toHaveCount(1);

    // TRUE keeps the DocumentName surface (still non-edit).
    await btns.true.click();
    await expect(formulaInput).toHaveCount(0);
    await expect(documentName).toHaveCount(1);

    // Back to EDIT: formula input remounts.
    await btns.edit.click();
    await expect(formulaInput).toHaveCount(1);
    await expect(documentName).toHaveCount(0);
  });
});
