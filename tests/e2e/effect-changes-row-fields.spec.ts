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
 * 2. The Field column (`AspectPicker`) no longer has a separate Target selector —
 *    both the item's and the owning actor's FormulaFamiliar contexts are offered
 *    together at all times, and picking a path from either one auto-derives
 *    `change.target` (persisted on the document) instead of requiring the user to
 *    keep a manual selector in sync.
 */
test.describe('Effect Changes row — field errors and auto-derived target contexts', () => {
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

  test('Field autocomplete always offers both item and actor contexts, and the picked path auto-derives change.target', async ({ page }) => {
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

    // No Target selector is rendered anymore.
    await expect(row.locator('.target-select')).toHaveCount(0);

    const fieldInput = row.locator('.aspect-picker-input');

    const readChangeTarget = () => page.evaluate(async (uuid: string) => {
      const effect = await (globalThis as any).fromUuid(uuid);
      return effect.system.changes[0].target as string;
    }, effectUuid);

    // The root of the Field dropdown always exposes both the item's own schema
    // AND the owning actor's schema at once — no Target switch required.
    await fieldInput.click();
    await fieldInput.fill('');
    await page.keyboard.type('#');
    await expect(sheet.locator('.familiar-dropdown')).toBeVisible({ timeout: 2_000 });
    const rootTitles = await readFamiliarOptionTitles(page, sheetSelector);
    await page.keyboard.press('Escape');
    expect(rootTitles.length).toBeGreaterThanOrEqual(2);

    // Typing a known item-scoped path resolves against the weapon's own schema
    // and persists `change.target === 'item'`.
    await fieldInput.click();
    await fieldInput.fill('system.weaponDamage.critMultiplier');
    await page.keyboard.press('Tab');
    await expect.poll(readChangeTarget).toBe('item');

    // Typing a known actor-scoped path resolves against the owning actor's schema
    // instead and persists `change.target === 'actor'` — no manual selector involved.
    await fieldInput.click();
    await fieldInput.fill('system.abilities.str.mod');
    await page.keyboard.press('Tab');
    await expect.poll(readChangeTarget).toBe('actor');
  });
});
