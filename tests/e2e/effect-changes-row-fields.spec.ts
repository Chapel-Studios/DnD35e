import { expect, test } from '@playwright/test';

import { clearWorld } from './helpers/documents.mjs';
import { readFamiliarOptionTitles } from './helpers/familiarDropdown.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * End-to-end: the AE Changes tab's per-row fields (`EffectChangesList.vue`).
 *
 * Covers two surfaces the unit suite can't reach without a real Vue mount +
 * real document pipeline:
 *
 * 1. Value-formula type-mismatch errors surface on the row (`.row-context.has-error`,
 *    non-empty error text) and highlight the input red (`.formula-input.has-error`),
 *    then both clear once the formula is fixed.
 * 2. The Field column's (`AspectPicker`) available FormulaFamiliar contexts change
 *    when the row's Target selector switches between `item` and `actor` — proven via
 *    the dropdown's stable `title` attributes (never localized display text), since
 *    the AE lives on a weapon owned by an actor and each target resolves a distinct
 *    live document schema.
 */
test.describe('Effect Changes row — field errors and target-aware contexts', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('Value formula error highlights the row/input and clears once fixed', async ({ page }) => {
    await gotoGame(page);

    const effectUuid = await page.evaluate(async () => {
      const actor = await (globalThis as any).Actor.create({ type: 'character', name: 'Row Fields Test Actor' });
      const [weapon] = await actor.createEmbeddedDocuments('Item', [{ type: 'weapon', name: 'Row Fields Test Weapon' }]);
      const [effect] = await weapon.createEmbeddedDocuments('ActiveEffect', [{
        name: 'Row Fields Test Effect',
        type: 'general',
        disabled: false,
        transfer: true,
        system: {
          changes: [{
            target: 'item',
            key: 'system.weaponDamage.critMultiplier',
            type: 'add',
            value: '1',
            phase: 'initial',
            priority: 10,
            isSystem: false,
          }],
        },
      }]);
      return effect.uuid as string;
    });

    // Defensive: ensure no stray sheet is left open from a prior test.
    await closeAllSheets(page).catch(() => {});
    const sheetSelector = await openDocumentSheet(page, effectUuid);
    const sheet = page.locator(sheetSelector);
    await dismissOverlays(page);

    await sheet.locator('nav.sheet-tabs a[data-tab="changes"]').click();

    const row = sheet.locator('.change-row[data-index="0"]');
    await expect(row).toBeVisible();

    const valueInput = row.locator('[data-field-path="system.changes.0.value"] .formula-input');
    const rowContext = row.locator('.row-context');

    // Starts valid: no error surfaced, input not highlighted.
    await expect(valueInput).not.toHaveClass(/has-error/);
    await expect(rowContext).not.toHaveClass(/has-error/);

    // Break it: critMultiplier is a number field, "abc" is not a valid number formula.
    await valueInput.click();
    await valueInput.fill('abc');
    await page.keyboard.press('Tab');

    await expect(valueInput).toHaveClass(/has-error/);
    await expect(rowContext).toHaveClass(/has-error/);
    await expect(rowContext.locator('.row-errors')).not.toHaveText('');

    // Fix it: back to a valid number formula.
    await valueInput.click();
    await valueInput.fill('2');
    await page.keyboard.press('Tab');

    await expect(valueInput).not.toHaveClass(/has-error/);
    await expect(rowContext).not.toHaveClass(/has-error/);
  });

  test('Field autocomplete contexts differ between item target and actor target', async ({ page }) => {
    await gotoGame(page);

    const effectUuid = await page.evaluate(async () => {
      const actor = await (globalThis as any).Actor.create({ type: 'character', name: 'Row Context Test Actor' });
      const [weapon] = await actor.createEmbeddedDocuments('Item', [{ type: 'weapon', name: 'Row Context Test Weapon' }]);
      const [effect] = await weapon.createEmbeddedDocuments('ActiveEffect', [{
        name: 'Row Context Test Effect',
        type: 'general',
        disabled: false,
        transfer: true,
        system: {
          changes: [{
            target: 'item',
            key: '',
            type: 'add',
            value: '',
            phase: 'initial',
            priority: 10,
            isSystem: false,
          }],
        },
      }]);
      return effect.uuid as string;
    });

    // Defensive: ensure no stray sheet is left open from a prior test.
    await closeAllSheets(page).catch(() => {});
    const sheetSelector = await openDocumentSheet(page, effectUuid);
    const sheet = page.locator(sheetSelector);
    await dismissOverlays(page);

    await sheet.locator('nav.sheet-tabs a[data-tab="changes"]').click();

    const row = sheet.locator('.change-row[data-index="0"]');
    await expect(row).toBeVisible();

    const fieldInput = row.locator('.aspect-picker-input');
    const targetSelect = row.locator('.target-select');

    await expect(targetSelect).toHaveValue('item');

    // Target = item: dropdown should expose the weapon's own item-scoped schema.
    await fieldInput.click();
    await fieldInput.fill('');
    await page.keyboard.type('#');
    await expect(sheet.locator('.familiar-dropdown')).toBeVisible({ timeout: 2_000 });
    const itemTitles = await readFamiliarOptionTitles(page, sheetSelector);
    await page.keyboard.press('Escape');

    // Switch Target to actor.
    await targetSelect.selectOption('actor');
    await expect(targetSelect).toHaveValue('actor');

    // Target = actor: dropdown should now expose the owning actor's schema instead.
    await fieldInput.click();
    await fieldInput.fill('');
    await page.keyboard.type('#');
    await expect(sheet.locator('.familiar-dropdown')).toBeVisible({ timeout: 2_000 });
    const actorTitles = await readFamiliarOptionTitles(page, sheetSelector);
    await page.keyboard.press('Escape');

    // The two context sets are not the same — proves the schema actually
    // swapped rather than staying pinned to whichever target loaded first.
    expect(itemTitles).not.toEqual(actorTitles);
    expect(itemTitles.length).toBeGreaterThan(0);
    expect(actorTitles.length).toBeGreaterThan(0);
  });
});
