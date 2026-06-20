import { expect, test } from '@playwright/test';

import { clearWorld, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * Regression: item name typed in the header formula input and committed with
 * Enter should surface consistently in every location that reflects the name:
 *
 *   1. The formula input itself (edit mode)
 *   2. The sheet window title
 *   3. The .item-name heading (play mode)
 *   4. The formula input again after returning to edit mode
 *
 * All name assertions use `expect.soft` so every location is checked even
 * if earlier ones fail — giving a holistic picture for debugging.
 */

const NEW_NAME = 'Renamed Sword';
const FIELD_PATH = 'system.nameFormula';

test.describe('item name update propagation', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('name committed with Enter propagates to input, header title, play mode, and back to edit', async ({ page }) => {
    await gotoGame(page);

    const itemUuid = await createItem(page, 'weapon', { name: 'Original Sword' });
    const sheet = await openDocumentSheet(page, itemUuid);

    // ─── Edit mode: type new name and commit with Enter ──────────────────────
    const nameInput = page.locator(
      `${sheet} [data-field-path="${FIELD_PATH}"] .formula-input`
    );
    await dismissOverlays(page);
    await nameInput.click();
    await nameInput.fill(NEW_NAME);
    await page.keyboard.press('Enter');

    // Wait for the document write to settle before checking any surface.
    await expect.poll(
      () => page.evaluate(
        async (uuid) => ((await (globalThis as any).fromUuid(uuid))?.name as string) ?? '',
        itemUuid
      ),
      { message: 'document.name should update after Enter commit' }
    ).toBe(NEW_NAME);

    // Wait for the input DOM value to reflect the new name. Vue's reactive
    // flush can lag behind the DB confirm by more than a simple setTimeout(0)
    // in certain timing windows; waitForFunction polls the real DOM property
    // and is more reliable than toHaveValue for this specific race.
    const nameInputSelector = `${sheet} [data-field-path="${FIELD_PATH}"] .formula-input`;
    await page.waitForFunction(
      ({ sel, name }) => (document.querySelector(sel) as HTMLInputElement)?.value === name,
      { sel: nameInputSelector, name: NEW_NAME },
      { timeout: 30_000 }
    );

    // 1. Input still shows the committed name (edit mode).
    await expect.soft(nameInput, 'edit-mode input should retain the new name').toHaveValue(NEW_NAME);

    // 2. Window title reflects the new name.
    await expect.soft(
      page.locator(`${sheet} .window-title`),
      'window title should contain the new name'
    ).toContainText(NEW_NAME);

    // ─── Play mode ───────────────────────────────────────────────────────────
    const bar = page.locator(`${sheet} .view-mode-bar`);
    const playBtn = bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-dice-d20') });
    await playBtn.click();
    await expect(playBtn).toHaveClass(/active/);

    // 3. .item-name heading — only present in play / true mode.
    await expect.soft(
      page.locator(`${sheet} .item-name`),
      '.item-name heading in play mode should show the new name'
    ).toHaveText(NEW_NAME);

    // ─── Back to edit mode ───────────────────────────────────────────────────
    const editBtn = bar.locator('.view-mode-btn').filter({ has: page.locator('i.fa-pen-to-square') });
    await editBtn.click();
    await expect(editBtn).toHaveClass(/active/);

    // 4. Formula input still shows the name after the mode round-trip.
    await expect.soft(
      nameInput,
      'input should still show the new name after returning to edit'
    ).toHaveValue(NEW_NAME, { timeout: 10_000 });
  });
});
