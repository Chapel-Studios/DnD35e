import { expect, test } from '@playwright/test';

import { clearWorld, createActiveEffect, createActor } from './helpers/documents.mjs';
import { gotoGame } from './helpers/session.mjs';
import { closeAllSheets } from './helpers/sheets.mjs';
import { dismissOverlays } from './helpers/ui.mjs';

test.afterEach(async ({ page }) => {
  await closeAllSheets(page);
  await clearWorld(page);
});

test('GM rolls saves and initiative using prepared totals rather than effect-history operands', async ({ page }) => {
  await gotoGame(page);
  const actorUuid = await createActor(page, 'character', {
    name: 'Prepared Rolls',
    system: { abilities: { con: { score: 16 }, dex: { score: 14 } } },
  });
  await createActiveEffect(page, actorUuid, {
    name: 'Non-additive rolls', type: 'general',
    system: {
      target: 'actor',
      changes: [
        { key: 'system.saves.fort', type: 'override', value: '12', phase: 'post', priority: 100, target: 'actor' },
        { key: 'system.init', type: 'override', value: '14', phase: 'post', priority: 100, target: 'actor' },
      ],
    },
  });
  const result = await page.evaluate(async (uuid) => {
    const actor = await (globalThis as any).fromUuid(uuid);
    const expectedSave = actor.system.saves.fort;
    const expectedInit = actor.system.init;
    const save = await actor.rollSave('fort', { skipDialog: true, situationalModifier: -2 });
    const init = await actor.rollInitiativeCheck({ skipDialog: true });
    return {
      expectedSave, expectedInit,
      save: save.options.situationalModifiers,
      init: init.options.situationalModifiers,
      saveFormula: save.formula, initFormula: init.formula,
    };
  }, actorUuid);
  expect(result.expectedSave).toBe(12);
  expect(result.expectedInit).toBe(14);
  expect(result.save[0]).toMatchObject({ value: 12, breakdown: expect.any(Array) });
  expect(result.init[0]).toMatchObject({ value: 14, breakdown: expect.any(Array) });
  expect(result.saveFormula).toContain('+ 10');
  expect(result.initFormula).toContain('+ 14');
});

test('GM confirms a melee modifier list and later resolves its unchanged damage snapshot and critical sources', async ({ page }) => {
  test.slow();
  await gotoGame(page);
  const actorUuid = await createActor(page, 'character', {
    name: 'Modifier Fighter', system: { abilities: { str: { score: 16 } } },
  });
  const targetUuid = await createActor(page, 'character', { name: 'Snapshot Target' });
  const weaponUuid = await page.evaluate(async ({ actorUuid }) => {
    const actor = await (globalThis as any).fromUuid(actorUuid);
    const weapons = await actor.createEmbeddedDocuments('Item', [{
      name: 'Snapshot Sword', type: 'weapon',
      system: {
        equippedSlotIds: ['mainHand'], weaponSubtype: 'oneHanded', isCarried: true,
      },
    }, {
      name: 'Off-hand dagger', type: 'weapon',
      system: { equippedSlotIds: ['offHand'], weaponSubtype: 'light', isCarried: true },
    }]);
    return weapons[0].uuid as string;
  }, { actorUuid });
  await expect.poll(() => page.evaluate(async (uuid) => {
    const weapon = await (globalThis as any).fromUuid(uuid);
    return weapon.system.actions.some((action: any) => action.type === 'melee_weapon_attack');
  }, weaponUuid)).toBe(true);
  await page.evaluate(async (uuid) => {
    const weapon = await (globalThis as any).fromUuid(uuid);
    const actions = weapon.toObject().system.actions;
    const action = actions.find((entry: any) => entry.type === 'melee_weapon_attack');
    Object.assign(action, {
      isSystemCreated: false,
      name: { formula: 'Snapshot Attack', expectedType: 'string' },
      attackFormula: { formula: '2', expectedType: 'rollFormula' },
      damageFormula: { formula: '1d8 - 2', expectedType: 'rollFormula' },
    });
    await weapon.update({ 'system.actions': actions });
  }, weaponUuid);
  await createActiveEffect(page, actorUuid, {
    name: 'BAB', type: 'general',
    system: {
      target: 'actor',
      changes: [{ key: 'system.bab', type: 'override', value: '6', phase: 'post', priority: 100, target: 'actor' }],
    },
  });
  await createActiveEffect(page, weaponUuid, {
    name: 'Mixed critical dice', type: 'general',
    system: {
      changes: [
        { key: 'system.actions.0.attackFormula.formula', type: 'add', value: '1', phase: 'final' },
        { key: 'system.actions.0.damageFormula.formula', type: 'add', value: '3 + 1d6 + $critMultiply(1d6)', phase: 'final' },
      ],
    },
  });
  await page.evaluate(async ({ weaponUuid, targetUuid }) => {
    const g = globalThis as any;
    const weapon = await g.fromUuid(weaponUuid);
    const target = await g.fromUuid(targetUuid);
    const action = weapon.system.actions.find((entry: any) => entry.type === 'melee_weapon_attack');
    if (!action) throw new Error('Expected the authored melee action before opening its dialog');
    const context = action.constructor.PrepareActionContext(weapon.actor, weapon, [target]);
    g.modifierPipelineResult = action.executeAction(context);
  }, { weaponUuid, targetUuid });

  const dialog = page.locator('.weapon-attack-roll-dialog');
  await expect(dialog).toBeVisible();
  await dismissOverlays(page);
  const twf = dialog.locator('[data-modifier-id="twoWeaponFighting"] input');
  await expect(twf).toBeChecked();
  await twf.uncheck();
  await dialog.locator('[data-modifier-id="proficient"] input').check();
  // Repeated toggles must not remove other sources or duplicate their own modifier.
  const flank = dialog.locator('[data-modifier-id="flanking"] input');
  await flank.check();
  await flank.uncheck();
  await flank.check();
  await expect(dialog.locator('#attack-situational-modifier')).toHaveCount(1);
  await expect(dialog.locator('#damage-situational-modifier')).toHaveCount(1);
  await dialog.locator('#attack-situational-modifier').fill('#self.abilities.str.mod');
  await page.keyboard.press('Tab');
  await dialog.locator('#damage-situational-modifier').fill('1d4 + 2');
  await page.keyboard.press('Tab');
  await dialog.locator('.roll-btn').click();

  const snapshot = await page.evaluate(async () => {
    const g = globalThis as any;
    const result = await g.modifierPipelineResult;
    const flags = result.attackMessage.getFlag('dnd35e', 'attackCard');
    const DamageRoll = g.CONFIG.Dice.rolls.find((RollClass: any) => RollClass.name === 'DamageRoll');
    const critical = await new DamageRoll(flags.resolvedDamageFormula).evaluateCritical(2, flags.damageExemptDiceIndices);
    return {
      messageId: result.attackMessage.id, flags,
      dice: critical.dice.map((die: any) => ({ number: die.number, faces: die.faces })),
    };
  });
  expect(snapshot.flags.modifierList.filter((mod: any) => mod.id === 'flanking')).toHaveLength(1);
  expect(snapshot.flags.modifierList.filter((mod: any) => mod.id === 'weaponAttack')).toMatchObject([{ value: 3 }]);
  expect(snapshot.flags.modifierList.some((mod: any) => mod.id === 'twoWeaponFighting')).toBe(false);
  expect(snapshot.flags.modifierList.find((mod: any) => mod.id === 'bab').value).toBe(6);
  expect(snapshot.flags.damageModifiers.find((mod: any) => mod.id === 'damageAbility').value).toBe(3);
  expect(snapshot.flags.damageModifiers.find((mod: any) => mod.id === 'weaponDamage').value).toBe(1);
  expect(snapshot.flags.damageExemptDiceIndices).toEqual([1]);
  expect(snapshot.dice).toEqual([
    { number: 2, faces: 8 }, { number: 1, faces: 6 }, { number: 2, faces: 6 }, { number: 1, faces: 4 },
  ]);

  // Altering the weapon now must not change this already-posted attack's damage.
  await page.evaluate(async ({ weaponUuid }) => {
    const weapon = await (globalThis as any).fromUuid(weaponUuid);
    const actions = weapon.toObject().system.actions;
    actions[0].damageFormula.formula = '100d20 + 100';
    await weapon.update({ 'system.actions': actions });
  }, { weaponUuid });
  // Foundry renders docked and pop-out chat copies. Exercise one handler without relying on sidebar placement.
  await page.locator(`.message[data-message-id="${snapshot.messageId}"] [data-action="apply-attack"]`).first().dispatchEvent('click');
  const defense = page.locator('.roll-defense-roll-dialog');
  await expect(defense).toBeVisible();
  await defense.locator('.form-group.full .multi-option-toggle button').nth(2).click();
  await defense.locator('.roll-btn').press('Enter');
  await expect.poll(async () => page.evaluate(() => (globalThis as any).game.messages.contents
    .filter((message: any) => message.getFlag('dnd35e', 'resolutionCard')).length)).toBe(1);
  const resolution = await page.evaluate(() => {
    const message = (globalThis as any).game.messages.contents.find((message: any) => message.getFlag('dnd35e', 'resolutionCard'));
    return { flags: message.getFlag('dnd35e', 'resolutionCard'), dice: message.rolls[0].dice.map((die: any) => die.faces) };
  });
  expect(resolution.flags.damageModifierList).toEqual(snapshot.flags.damageModifiers);
  expect(resolution.dice).toEqual([8, 6, 6, 4]);
});
