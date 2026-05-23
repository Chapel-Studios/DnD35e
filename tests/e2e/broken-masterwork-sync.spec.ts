import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * End-to-end: Broken / Masterwork Material AE sync cycle.
 *
 * Covers Story 3 from POC Phase 5:
 *   - isMasterwork sheet toggle → creates/removes system-managed Masterwork AE
 *   - Custom Masterwork AE is preserved when the system-managed one is removed
 *   - Manual Broken AE enable/disable → isBroken derived value reflects AE state
 *   - HP drops to 0 → _onUpdate fires syncBrokenAeState; restored HP → disables
 *   - Broken + Masterwork + Standard material AEs coexist (independent bonus types)
 *
 * `isBroken` and `isMasterwork` are DERIVED flags (not stored). They are
 * computed each prepareData cycle from the active material AEs on the item.
 * There is no _onCreate auto-attach; tests create AEs explicitly via the
 * programmatic API or through the sheet toggle.
 */

// ─── Document inspection helpers ────────────────────────────────────────────

interface WeaponSystemSnapshot {
  isBroken: boolean;
  isMasterwork: boolean;
}

interface AeSummary {
  uuid: string;
  name: string;
  disabled: boolean;
  materialSubtype: string;
  systemManaged: boolean;
}

async function readWeaponSystem (page: Page, itemUuid: string): Promise<WeaponSystemSnapshot> {
  return page.evaluate(async (uuid) => {
    const item = await (globalThis as any).fromUuid(uuid);
    return {
      isBroken: item.system.isBroken as boolean,
      isMasterwork: item.system.isMasterwork as boolean,
    };
  }, itemUuid);
}

async function listMaterialAes (page: Page, itemUuid: string): Promise<AeSummary[]> {
  return page.evaluate(async (uuid) => {
    const item = await (globalThis as any).fromUuid(uuid);
    return [...(item.effects ?? [])]
      .filter((e: any) => e.type === 'material')
      .map((e: any) => ({
        uuid: e.uuid as string,
        name: e.name as string,
        disabled: e.disabled as boolean,
        materialSubtype: (e.system?.materialSubtype ?? '') as string,
        systemManaged: (e.flags?.dnd35e?.systemManaged ?? false) as boolean,
      }));
  }, itemUuid);
}

async function setAeDisabled (page: Page, aeUuid: string, disabled: boolean): Promise<void> {
  await page.evaluate(async ({ uuid, disabled }) => {
    const ae = await (globalThis as any).fromUuid(uuid);
    await ae.update({ disabled });
  }, { uuid: aeUuid, disabled });
}

async function updateItemSystem (
  page: Page,
  itemUuid: string,
  systemDelta: Record<string, unknown>
): Promise<void> {
  await page.evaluate(async ({ uuid, delta }) => {
    const item = await (globalThis as any).fromUuid(uuid);
    await item.update(delta);
  }, { uuid: itemUuid, delta: systemDelta });
}

// ─── Sheet navigation ────────────────────────────────────────────────────────

async function openDetailsTab (page: Page, sheetSelector: string): Promise<void> {
  const tab = page.locator(`${sheetSelector} nav.sheet-tabs a[data-tab="details"]`);
  await tab.waitFor({ state: 'visible', timeout: 10_000 });
  await tab.click();
}

// ─── Spec ────────────────────────────────────────────────────────────────────

test.describe('Broken / Masterwork AE sync cycle', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  // ─── isMasterwork sheet toggle ──────────────────────────────────────────

  test('toggling isMasterwork on creates a system-managed Masterwork AE from compendium', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createItem(page, 'weapon', { name: 'Test Sword' });

    // Baseline: no masterwork AE, flag is false.
    const baseline = await listMaterialAes(page, itemUuid);
    expect(baseline.filter(a => a.materialSubtype === 'masterwork')).toHaveLength(0);
    expect((await readWeaponSystem(page, itemUuid)).isMasterwork).toBe(false);

    // Open sheet and navigate to the Details tab.
    const sheet = await openDocumentSheet(page, itemUuid);
    await openDetailsTab(page, sheet);
    await dismissOverlays(page);

    // Click the isMasterwork checkbox to enable it.
    const checkbox = page.locator(`${sheet} [data-field-path="system.isMasterwork"] input[type="checkbox"]`);
    await checkbox.waitFor({ state: 'visible', timeout: 10_000 });
    await checkbox.click();

    // A system-managed masterwork AE should appear (created from compendium).
    await expect.poll(async () => {
      const aes = await listMaterialAes(page, itemUuid);
      return aes.filter(a => a.materialSubtype === 'masterwork').length;
    }, { timeout: 15_000 }).toBe(1);

    const [mwAe] = (await listMaterialAes(page, itemUuid)).filter(a => a.materialSubtype === 'masterwork');
    expect(mwAe.systemManaged).toBe(true);
    expect(mwAe.disabled).toBe(false);

    // Derived flag should now read true.
    await expect.poll(() => readWeaponSystem(page, itemUuid).then(s => s.isMasterwork), { timeout: 10_000 }).toBe(true);
  });

  test('toggling isMasterwork off removes the system-managed AE', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createItem(page, 'weapon', { name: 'Masterwork Sword' });

    // Pre-seed a system-managed masterwork AE so the checkbox renders checked.
    await createActiveEffect(page, itemUuid, {
      name: 'Masterwork Weapon',
      type: 'material',
      disabled: false,
      system: { materialSubtype: 'masterwork' },
      flags: { dnd35e: { systemManaged: true } },
    });

    const sheet = await openDocumentSheet(page, itemUuid);
    await openDetailsTab(page, sheet);
    await dismissOverlays(page);

    const checkbox = page.locator(`${sheet} [data-field-path="system.isMasterwork"] input[type="checkbox"]`);
    await checkbox.waitFor({ state: 'visible', timeout: 10_000 });
    // Checkbox should be checked because isMasterwork is true.
    await expect(checkbox).toBeChecked();

    // Uncheck — fires toggleMasterwork(false) → syncMasterworkAeState removes the AE.
    await checkbox.click();

    await expect.poll(async () => {
      const aes = await listMaterialAes(page, itemUuid);
      return aes.filter(a => a.materialSubtype === 'masterwork').length;
    }, { timeout: 15_000 }).toBe(0);

    await expect.poll(() => readWeaponSystem(page, itemUuid).then(s => s.isMasterwork), { timeout: 10_000 }).toBe(false);
  });

  test('custom Masterwork AE is preserved when the system-managed one is toggled off', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createItem(page, 'weapon', { name: 'Special Sword' });

    // Custom AE: no systemManaged flag.
    await createActiveEffect(page, itemUuid, {
      name: 'Custom Masterwork Enhancement',
      type: 'material',
      disabled: false,
      system: { materialSubtype: 'masterwork' },
    });
    // System-managed AE alongside it.
    await createActiveEffect(page, itemUuid, {
      name: 'Masterwork Weapon',
      type: 'material',
      disabled: false,
      system: { materialSubtype: 'masterwork' },
      flags: { dnd35e: { systemManaged: true } },
    });

    // Both exist, isMasterwork is true.
    const priorAes = await listMaterialAes(page, itemUuid);
    expect(priorAes.filter(a => a.materialSubtype === 'masterwork')).toHaveLength(2);

    const sheet = await openDocumentSheet(page, itemUuid);
    await openDetailsTab(page, sheet);
    await dismissOverlays(page);

    const checkbox = page.locator(`${sheet} [data-field-path="system.isMasterwork"] input[type="checkbox"]`);
    await checkbox.waitFor({ state: 'visible', timeout: 10_000 });
    await checkbox.click(); // Toggle off → only system-managed AE removed.

    // Count drops from 2 → 1; the survivor is the custom AE.
    await expect.poll(async () => {
      const aes = await listMaterialAes(page, itemUuid);
      return aes.filter(a => a.materialSubtype === 'masterwork').length;
    }, { timeout: 15_000 }).toBe(1);

    const [survivor] = (await listMaterialAes(page, itemUuid)).filter(a => a.materialSubtype === 'masterwork');
    expect(survivor.systemManaged).toBe(false);
    expect(survivor.name).toBe('Custom Masterwork Enhancement');

    // isMasterwork is now false because the custom AE was disabled alongside the system-managed deletion.
    await expect.poll(() => readWeaponSystem(page, itemUuid).then(s => s.isMasterwork), { timeout: 10_000 }).toBe(false);
  });

  // ─── isBroken manual AE sync ────────────────────────────────────────────

  test('enabling a Broken AE sets isBroken=true; disabling it sets isBroken=false', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createItem(page, 'weapon', { name: 'Fragile Sword' });

    // Create a disabled broken AE (no HP drop needed — just testing derived sync).
    const brokenAeUuid = await createActiveEffect(page, itemUuid, {
      name: 'Broken Weapon',
      type: 'material',
      disabled: true,
      system: { materialSubtype: 'broken' },
      flags: { dnd35e: { systemManaged: true } },
    });

    // Initially disabled → isBroken should be false.
    expect((await readWeaponSystem(page, itemUuid)).isBroken).toBe(false);

    // Enable the AE — isBroken should flip to true.
    await setAeDisabled(page, brokenAeUuid, false);
    await expect.poll(() => readWeaponSystem(page, itemUuid).then(s => s.isBroken), { timeout: 10_000 }).toBe(true);

    // Disable again — isBroken should flip back to false.
    await setAeDisabled(page, brokenAeUuid, true);
    await expect.poll(() => readWeaponSystem(page, itemUuid).then(s => s.isBroken), { timeout: 10_000 }).toBe(false);
  });

  // ─── HP-driven broken sync ──────────────────────────────────────────────

  test('HP drops to 0 → broken AE auto-enables; HP restored → AE disables', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createItem(page, 'weapon', {
      name: 'Durable Sword',
      system: { hp: { current: 5, max: 10 } },
    });

    // Pre-seed a disabled system-managed broken AE so syncBrokenAeState does not
    // need the compendium (which may be unavailable in the E2E test environment).
    await createActiveEffect(page, itemUuid, {
      name: 'Broken Weapon',
      type: 'material',
      disabled: true,
      system: { materialSubtype: 'broken' },
      flags: { dnd35e: { systemManaged: true } },
    });

    // Disabled AE → isBroken is false.
    expect((await readWeaponSystem(page, itemUuid)).isBroken).toBe(false);

    // HP → 0 triggers _onUpdate → syncBrokenAeState(item, true).
    // Use nested path so changed.system is populated in _onUpdate.
    await updateItemSystem(page, itemUuid, { system: { hp: { current: 0 } } });

    // isBroken should become true (pre-seeded AE gets enabled).
    await expect.poll(() => readWeaponSystem(page, itemUuid).then(s => s.isBroken), {
      timeout: 15_000,
    }).toBe(true);

    // The broken AE should now be enabled.
    const brokenAes = (await listMaterialAes(page, itemUuid)).filter(a => a.materialSubtype === 'broken');
    expect(brokenAes).toHaveLength(1);
    expect(brokenAes[0].disabled).toBe(false);
    expect(brokenAes[0].systemManaged).toBe(true);

    // Restore HP → syncBrokenAeState(item, false) disables the AE.
    await updateItemSystem(page, itemUuid, { system: { hp: { current: 5 } } });

    await expect.poll(() => readWeaponSystem(page, itemUuid).then(s => s.isBroken), {
      timeout: 15_000,
    }).toBe(false);

    const afterRestore = (await listMaterialAes(page, itemUuid)).filter(a => a.materialSubtype === 'broken');
    expect(afterRestore[0].disabled).toBe(true);
  });

  // ─── Multi-subtype coexistence ──────────────────────────────────────────

  test('Broken + Masterwork + Standard material AEs coexist on the same weapon', async ({ page }) => {
    await gotoGame(page);
    const itemUuid = await createItem(page, 'weapon', { name: 'Complex Sword' });

    // Add one AE of each subtype.
    await createActiveEffect(page, itemUuid, {
      name: 'Adamantine',
      type: 'material',
      disabled: false,
      system: {
        materialSubtype: 'standard',
        hardness: 20,
        bonusHp: 40,
        damageReductionTypes: ['adamantine'],
      },
    });
    await createActiveEffect(page, itemUuid, {
      name: 'Broken Weapon',
      type: 'material',
      disabled: false,
      system: { materialSubtype: 'broken' },
      flags: { dnd35e: { systemManaged: true } },
    });
    await createActiveEffect(page, itemUuid, {
      name: 'Masterwork Weapon',
      type: 'material',
      disabled: false,
      system: { materialSubtype: 'masterwork' },
      flags: { dnd35e: { systemManaged: true } },
    });

    const aes = await listMaterialAes(page, itemUuid);
    expect(aes).toHaveLength(3);

    // Each subtype is represented exactly once.
    const subtypes = new Set(aes.map(a => a.materialSubtype));
    expect(subtypes).toEqual(new Set(['standard', 'broken', 'masterwork']));

    // Both derived flags are true simultaneously (independent bonus-type slots).
    const sys = await readWeaponSystem(page, itemUuid);
    expect(sys.isBroken).toBe(true);
    expect(sys.isMasterwork).toBe(true);
  });
});
