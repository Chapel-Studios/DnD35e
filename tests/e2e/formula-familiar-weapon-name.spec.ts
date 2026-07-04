import { expect, test } from '@playwright/test';

import { clearWorld, createItem } from './helpers/documents.mjs';
import {
  dismissFamiliar,
  familiarInput,
  familiarMenu,
  openFamiliar,
  readFamiliarOptionTitles,
  selectFamiliarOption,
} from './helpers/familiarDropdown.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
/**
 * End-to-end: FormulaFamiliar autocomplete on the weapon header name field.
 *
 * The header name field renders a `FormulaFormGroup` bound to
 * `system.nameFormula`. Typing an unescaped `#` opens a context-aware
 * dropdown driven by the weapon's `FamiliarSchema`. Selecting a branch
 * drills one level deeper; selecting a leaf inserts the localized
 * `option.fullPath` (e.g. `#Self.WeaponDamage.DamageRoll`) into the input.
 *
 * Assertions use each option's stable `title` attribute (set to
 * `accessPath` for schema-derived entries and `fullPath` for top-level
 * contexts) rather than the localized `.option-path` label.
 *
 * On blur the formula commits to the document, resolution runs, and the
 * `.item-name` heading reflects the resolved value.
 */

const FIELD_PATH = 'system.nameFormula';

test.describe('FormulaFamiliar dropdown on weapon name', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('GM opens weapon sheet, drills into Self.weaponDamage.damageRoll, and the resolved name reflects in the header', async ({ page }) => {
    await gotoGame(page);

    const weaponUuid = await createItem(page, 'weapon', {
      name: 'Test Sword',
      system: {
        weaponDamage: { damageRoll: '1d8+1' },
      },
    });

    const sheetSelector = await openDocumentSheet(page, weaponUuid);

    // Open dropdown at root: should expose item-scoped contexts.
    await openFamiliar(page, sheetSelector, FIELD_PATH);
    const rootTitles = await readFamiliarOptionTitles(page, sheetSelector);
    // Root-level context titles fall back to `fullPath` (`#Self.` / `#Owner.`).
    expect(rootTitles.some((t) => t.startsWith('#Self'))).toBe(true);
    expect(rootTitles.some((t) => t.startsWith('#Owner'))).toBe(true);

    // Drill into Self — should reopen the menu one level deeper.
    const selfTitle = rootTitles.find((t) => t.startsWith('#Self'))!;
    await selectFamiliarOption(page, sheetSelector, selfTitle);
    await expect(familiarMenu(page, sheetSelector)).toBeVisible();

    const selfTitles = await readFamiliarOptionTitles(page, sheetSelector);
    // Weapon-scoped schema fields are visible (titles carry accessPath for
    // leaves; SchemaField branches use the localized fullPath with a trailing
    // dot, e.g. `#Self.WeaponDamage.`).
    expect(selfTitles).toContain('system.weaponType');
    expect(selfTitles).toContain('system.weaponSubtype');
    expect(selfTitles.some((t) => /^#Self\.WeaponDamage\.?$/i.test(t))).toBe(true);
    // Opt-out fields (formulaVisible: false on the schema) are excluded.
    expect(selfTitles).not.toContain('system.nameFormula');
    expect(selfTitles).not.toContain('system.description');
    expect(selfTitles).not.toContain('system.version');
    expect(selfTitles).not.toContain('system.slug');

    // Drill into WeaponDamage — should reopen with damage sub-fields.
    const weaponDamageTitle = selfTitles.find((t) => /^#Self\.WeaponDamage\.?$/i.test(t))!;
    await selectFamiliarOption(page, sheetSelector, weaponDamageTitle);
    await expect(familiarMenu(page, sheetSelector)).toBeVisible();

    const damageTitles = await readFamiliarOptionTitles(page, sheetSelector);
    expect(damageTitles).toContain('system.weaponDamage.damageRoll');
    expect(damageTitles).toContain('system.weaponDamage.damageType');
    expect(damageTitles).toContain('system.weaponDamage.critRange');
    expect(damageTitles).toContain('system.weaponDamage.critMultiplier');

    // Select the damageRoll leaf — dropdown closes and the input value
    // contains the resolved path.
    await selectFamiliarOption(page, sheetSelector, 'system.weaponDamage.damageRoll');
    await expect(familiarMenu(page, sheetSelector)).toBeHidden();

    const input = familiarInput(page, sheetSelector, FIELD_PATH);
    // The inserted text is the localized fullPath, e.g. `#Self.WeaponDamage.DamageRoll`.
    await expect(input).toHaveValue(/^#Self\.WeaponDamage\.DamageRoll/i);

    // Commit by moving focus away (Tab triggers a real blur event on the input).
    await page.keyboard.press('Tab');

    // The formula persists on the document in canonical (lowercase) form.
    await expect.poll(async () => {
      return await page.evaluate(async (uuid) => {
        const doc = await (globalThis as any).fromUuid(uuid);
        return doc?.system?.nameFormula?.formula ?? null;
      }, weaponUuid);
    }, { timeout: 5_000 }).toBe('#self.weaponDamage.damageRoll');

    // Resolution flows formula → mask → `doc.name`. (The header `.item-name`
    // element renders only in play/true mode; this spec stays in edit mode
    // so we verify the doc-level state directly.)
    const resolvedName = await page.evaluate(async (uuid) => {
      const doc = await (globalThis as any).fromUuid(uuid);
      return doc?.name ?? null;
    }, weaponUuid);
    expect(resolvedName).toBe('1d8+1');
  });

  test('Escape dismisses the dropdown without committing', async ({ page }) => {
    await gotoGame(page);

    const weaponUuid = await createItem(page, 'weapon', { name: 'Escape Sword' });
    const sheetSelector = await openDocumentSheet(page, weaponUuid);

    await openFamiliar(page, sheetSelector, FIELD_PATH);
    await dismissFamiliar(page, sheetSelector);

    // Document name remains untouched.
    const stored = await page.evaluate(async (uuid) => {
      const doc = await (globalThis as any).fromUuid(uuid);
      return doc?.name ?? null;
    }, weaponUuid);
    expect(stored).toBe('Escape Sword');
  });

  test('resolves a derived (persisted:false) field in the name formula', async ({ page }) => {
    await gotoGame(page);

    // `system.isBroken` is a derived field (persisted:false) — it is absent from
    // source `toObject()` data. Regression guard: the `get name()` path must still
    // resolve it (it reads derived values via `doc.system.toObject(false)`).
    const weaponUuid = await createItem(page, 'weapon', {
      name: 'Broke Test',
      system: {
        nameFormula: { formula: '#self.isBroken', expectedType: 'string', resolvedValue: null },
      },
    });

    const resolved = await page.evaluate(async (uuid) => {
      const doc = await (globalThis as any).fromUuid(uuid);
      return { isBroken: doc?.system?.isBroken, name: doc?.name };
    }, weaponUuid);

    // Weapon has no broken-material AE, so isBroken is false → name resolves to "false"
    // (not the raw formula, which was the bug).
    expect(resolved.isBroken).toBe(false);
    expect(resolved.name).toBe('false');
  });
});
