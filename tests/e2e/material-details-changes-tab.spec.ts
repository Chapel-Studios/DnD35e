import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createItem } from './helpers/documents.mjs';
import { openMaterialSheet } from './helpers/materialSheet.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets } from './helpers/sheets.mjs';

/**
 * End-to-end: Material AE Details fields propagate to the Changes tab.
 *
 * Exercises the full wiring of `MaterialSystemModel.prepareDerivedData` →
 * `buildMaterialChanges` → persisted `system.changes` → `EffectChangesList`
 * DOM. Cascade-rule depth and per-subtype bonus tagging are covered by the
 * `material-changes` unit suite; this spec only proves the surfaces line up
 * end-to-end through Foundry.
 *
 * Asserting against displayed AspectPicker text would be brittle (it resolves
 * known paths to i18n labels and leaves SetField paths raw), so we
 * cross-check DOM row count against the document's own `system.changes`
 * array and assert each row carries the subtype-derived bonus type
 * (`material` for `standard`).
 */

const WEAPON_NAME = 'Adamantine Test Blade';

interface MaterialSeed {
  hardness?: number;
  bonusHp?: number;
  damageReductionTypes?: readonly string[];
}

async function createWeaponWithMaterial (
  page: Page,
  seed: MaterialSeed = { hardness: 5, bonusHp: 10, damageReductionTypes: ['adamantine'] }
): Promise<string> {
  const itemUuid = await createItem(page, 'weapon', { name: WEAPON_NAME, ownership: { default: 2 } });
  return await createActiveEffect(page, itemUuid, {
    name: 'Adamantine',
    type: 'material',
    img: 'icons/svg/anchor.svg',
    disabled: false,
    system: {
      materialSubtype: 'standard',
      hardness: seed.hardness ?? 0,
      bonusHp: seed.bonusHp ?? 0,
      damageReductionTypes: seed.damageReductionTypes ?? [],
    },
  });
}

interface ChangeRow {
  key: string;
  value: unknown;
  type: string;
  bonusType: string;
}

/** Read the live `system.changes` array from the AE document. */
async function readDocChanges (page: Page, aeUuid: string): Promise<ChangeRow[]> {
  return await page.evaluate(async (uuid) => {
    const ae = await (globalThis as any).fromUuid(uuid);
    return (ae.system.changes ?? []).map((c: any) => ({
      key: c.key,
      value: c.value,
      type: c.type,
      bonusType: c.bonusType ?? '',
    }));
  }, aeUuid);
}

test.describe('Material AE — Details ↔ Changes tab', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('Details-tab fields produce matching change rows on the Changes tab', async ({ page }) => {
    await gotoGame(page);
    const aeUuid = await createWeaponWithMaterial(page);

    const po = await openMaterialSheet(page, aeUuid);

    // Details is the default tab; bounce to it explicitly to lock the assertion.
    await po.activateTab('details');
    await expect(po.detailsTab).toHaveAttribute('aria-selected', 'true');

    // Switch to Changes; the system-emitted rows should be present.
    await po.activateTab('changes');
    await expect(po.changesTab).toHaveAttribute('aria-selected', 'true');

    // Cross-check: DOM row count matches the document's `system.changes` length.
    const docChanges = await readDocChanges(page, aeUuid);
    expect(docChanges.length).toBe(3); // hardness, hp.max, damageReductionTypes
    await expect.poll(() => po.changeRows().count()).toBe(docChanges.length);

    // Every system row carries the `material` bonus type (subtype: standard).
    // BonusType is stored as an i18n key (`dnd35e.BONUS_TYPES.Material`).
    expect(docChanges.every(c => c.bonusType === 'dnd35e.BONUS_TYPES.Material')).toBe(true);

    // The Details-tab values feed the change values verbatim.
    const byKey = Object.fromEntries(docChanges.map(c => [c.key, c.value]));
    expect(byKey['system.hardness']).toBe(5);
    expect(byKey['system.hp.max']).toBe(10);
    expect(byKey['system.damageReductionTypes']).toBe('adamantine');
  });
});
