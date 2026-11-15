import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createActor, createItem } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets, openDocumentSheet } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

/**
 * End-to-end: `$typed(damageType, formula)` (poc.10 Story J) resolved through the REAL
 * `FormulaData.resolveSource()`/`Roll.parse()` pipeline — not hand-built stub markers (the
 * unit-test boundary documented in `function-grammar.test.mts`). Proves:
 * - Nesting `$critMultiply`/`$typed` in either order converges on the same composed marker
 *   bag (the composability fix this story's marker-bag rewrite exists for).
 * - A flaming weapon's sheet shows a clean damage formula (no leaked marker text) and
 *   correctly attributes its AE-contributed Fire die separately from the weapon's own
 *   Slashing base damage.
 * - The actual rolled damage correctly separates the two sources and exempts the AE's die
 *   from critical multiplication by default (SRD: extra damage dice are never multiplied).
 */

/** Creates a one-handed weapon with a single melee attack action, then overwrites that action's `damageFormula` with `formula` — used by the nesting-order test, which only cares about formula resolution. */
async function createWeaponWithDamageFormula(page: Page, name: string, formula: string): Promise<string> {
  const weaponUuid = await createItem(page, 'weapon', {
    name, system: { weaponSubtype: 'oneHanded', isCarried: true, equippedSlotIds: ['mainHand'] },
  });
  await expect.poll(() => page.evaluate(async (uuid) => {
    const weapon = await (globalThis as any).fromUuid(uuid);
    return weapon.system.actions.some((action: any) => action.type === 'melee_weapon_attack');
  }, weaponUuid)).toBe(true);
  await page.evaluate(async ({ uuid, formula }) => {
    const weapon = await (globalThis as any).fromUuid(uuid);
    const actions = weapon.toObject().system.actions;
    const action = actions.find((entry: any) => entry.type === 'melee_weapon_attack');
    action.damageFormula = { formula, expectedType: 'rollFormula' };
    await weapon.update({ 'system.actions': actions });
  }, { uuid: weaponUuid, formula });
  return weaponUuid;
}

test.describe('$typed() damage-type marker — real formula resolution (poc.10 Story J)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllSheets(page).catch(() => {});
    await clearWorld(page);
  });

  test('resolves to the same composed marker bag regardless of $critMultiply/$typed nesting order', async ({ page }) => {
    await gotoGame(page);

    const outerCritUuid = await createWeaponWithDamageFormula(page, 'Outer Crit', '$critMultiply($typed(fire, 1d6))');
    const outerTypedUuid = await createWeaponWithDamageFormula(page, 'Outer Typed', '$typed(fire, $critMultiply(1d6))');

    const readResolved = (uuid: string) => page.evaluate(async (uuid) => {
      const weapon = await (globalThis as any).fromUuid(uuid);
      const action = weapon.system.actions.find((entry: any) => entry.type === 'melee_weapon_attack');
      return action.damageFormula.resolvedValue as string;
    }, uuid);

    const outerCritResolved = await readResolved(outerCritUuid);
    const outerTypedResolved = await readResolved(outerTypedUuid);

    // Both nesting orders resolve through the real pipeline to a SINGLE die term carrying both
    // dimensions. The bag's own key=value order can differ (whichever function resolves
    // outermost writes its key last), so check substrings rather than one exact string.
    for (const resolved of [outerCritResolved, outerTypedResolved]) {
      expect(resolved).toMatch(/^1d6\[__dnd35e_marker__/);
      expect(resolved).toContain('crit=multiply');
      expect(resolved).toContain('type=dnd35e.DAMAGE_TYPES.Fire');
    }
  });

  test('a flaming weapon separates Slashing base damage from Fire bonus damage in both the sheet and the roll breakdown', async ({ page }) => {
    test.slow();
    await gotoGame(page);

    const actorUuid = await createActor(page, 'character', { name: 'Flaming Weapon Wielder' });
    const weaponUuid = await page.evaluate(async (actorUuid) => {
      const actor = await (globalThis as any).fromUuid(actorUuid);
      const [weapon] = await actor.createEmbeddedDocuments('Item', [{
        name: 'Flaming Greatsword', type: 'weapon',
        system: { weaponSubtype: 'twoHanded', isCarried: true, equippedSlotIds: ['mainHand', 'offHand'] },
      }]);
      return weapon.uuid as string;
    }, actorUuid);

    await expect.poll(() => page.evaluate(async (uuid) => {
      const weapon = await (globalThis as any).fromUuid(uuid);
      return weapon.system.actions.some((action: any) => action.type === 'melee_weapon_attack');
    }, weaponUuid)).toBe(true);

    // Base damage: a plain, predictable 2d6 Slashing (the schema default damageType).
    await page.evaluate(async (uuid) => {
      const weapon = await (globalThis as any).fromUuid(uuid);
      const actions = weapon.toObject().system.actions;
      const action = actions.find((entry: any) => entry.type === 'melee_weapon_attack');
      action.damageFormula = { formula: '2d6', expectedType: 'rollFormula' };
      await weapon.update({ 'system.actions': actions });
    }, weaponUuid);

    // AE bonus damage: a separate, explicitly Fire-typed die — same authoring shape as the
    // Lily Knight fixture's own "+1 Flaming" effect.
    await createActiveEffect(page, weaponUuid, {
      name: '+1 Flaming', type: 'general',
      system: {
        changes: [
          { key: 'system.actions.0.damageFormula.formula', type: 'add', value: '$typed(fire, 1d6)', phase: 'final' },
        ],
      },
    });

    // --- Sheet display (items #5/#6 of the review feedback) ---
    const sheet = await openDocumentSheet(page, actorUuid);
    await dismissOverlays(page);
    await page.locator(`${sheet} [data-tab="actions"]`).click();

    const row = page.locator(`${sheet} .weapon-row`).first();
    await expect(row).toBeVisible();

    const damageText = (await row.locator('.weapon-num-col').nth(1).textContent())?.trim() ?? '';
    // Item #5 — the display formula must never leak the internal marker-bag text.
    expect(damageText).not.toContain('__dnd35e_marker__');

    // Item #6 — derive the expected label from the same localization source the UI itself
    // reads from (never hardcode localized display text — see e2e selector strategy).
    const expectedTypeLabel = await page.evaluate(() => {
      const g = globalThis as any;
      return [g.game.i18n.localize('dnd35e.DAMAGE_TYPES.Slashing'), g.game.i18n.localize('dnd35e.DAMAGE_TYPES.Fire')].join(' + ');
    });
    const typeText = (await row.locator('.weapon-type-col').textContent())?.trim();
    expect(typeText).toBe(expectedTypeLabel);

    // --- Roll breakdown: a real DamageRoll, not stub markers ---
    const targetUuid = await createActor(page, 'character', { name: 'Target Dummy' });
    await page.evaluate(async ({ weaponUuid, targetUuid }) => {
      const g = globalThis as any;
      const weapon = await g.fromUuid(weaponUuid);
      const target = await g.fromUuid(targetUuid);
      const action = weapon.system.actions.find((entry: any) => entry.type === 'melee_weapon_attack');
      const context = action.constructor.PrepareActionContext(weapon.actor, weapon, [target]);
      g.flamingAttackResult = action.executeAction(context);
    }, { weaponUuid, targetUuid });

    const dialog = page.locator('.weapon-attack-roll-dialog');
    await expect(dialog).toBeVisible();
    await dismissOverlays(page);
    await dialog.locator('.roll-btn').click();

    const snapshot = await page.evaluate(async () => {
      const g = globalThis as any;
      const result = await g.flamingAttackResult;
      const flags = result.attackMessage.getFlag('dnd35e', 'attackCard');
      const DamageRoll = g.CONFIG.Dice.rolls.find((RollClass: any) => RollClass.name === 'DamageRoll');
      const critical = await new DamageRoll(flags.resolvedDamageFormula).evaluateCritical(2, flags.damageExemptDiceIndices);
      return {
        resolvedDamageFormula: flags.resolvedDamageFormula as string,
        exemptDiceIndices: flags.damageExemptDiceIndices as number[],
        dice: critical.dice.map((die: any) => ({ number: die.number, faces: die.faces })),
      };
    });

    // The real roll's own flavor is source-attribution only (weapon name vs. AE name) — damage
    // type never leaks into it (see flavorDamageDiceBySource()'s doc comment) — and no internal
    // marker text leaks either, matching the sheet's own display.
    expect(snapshot.resolvedDamageFormula).not.toContain('__dnd35e_marker__');
    expect(snapshot.resolvedDamageFormula).toContain('[Flaming Greatsword]');
    expect(snapshot.resolvedDamageFormula).toContain('[+1 Flaming]');
    // The AE's Fire die defaults to crit-exempt (SRD: extra damage dice are never multiplied) —
    // it's the second real Die encountered (index 1), right after the weapon's own 2d6 base.
    expect(snapshot.exemptDiceIndices).toEqual([1]);
    // evaluateCritical(2, ...) doubles the DICE COUNT of every non-exempt eligible die (the
    // weapon's own 2d6 becomes 4d6) and leaves the exempt AE die's count untouched.
    expect(snapshot.dice).toEqual([{ number: 4, faces: 6 }, { number: 1, faces: 6 }]);
  });
});
