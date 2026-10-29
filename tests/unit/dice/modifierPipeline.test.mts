import { evaluateDefense } from '@source/dice/chatCards/resolutionCard/evaluateDefense.mjs';
import { buildModifiersD20Formula, getDisplayModifiers, getModifiersFormula } from '@source/dice/rollModifiers.mjs';
import type { RollModifier } from '@source/dice/types.mjs';
import { useMeleeAttackRollDialogStore } from '@source/rollDialogs/MeleeAttackRollDialog/MeleeAttackRollDialogStore.mjs';
import { useRollDefenseDialogStore } from '@source/rollDialogs/RollDefenseDialog/RollDefenseDialogStore.mjs';
import type { RollDefenseDialogData, RollDefenseDialogResult } from '@source/rollDialogs/RollDefenseDialog/types.mjs';
import type { RollDialogContext } from '@source/rollDialogs/RollDialog/types.mjs';
import type { WeaponAttackRollDialogContext } from '@source/rollDialogs/WeaponAttackRollDialog/types.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prepared: RollModifier = {
  id: 'prepared', label: 'Prepared', value: 12,
  breakdown: [
    { label: 'Base', value: 4 },
    { label: 'Multiply', value: 3, formula: '* 3' },
    { label: 'Losing bonus', value: 100, isIgnored: true, ignoredReason: 'Lower priority' },
  ],
};

function makeAttackContext(): WeaponAttackRollDialogContext {
  const actor: Pick<WeaponAttackRollDialogContext['data']['actor'], 'name' | 'img'> = { name: 'Actor', img: 'icons/svg/mystery-man.svg' };
  const immutableModifiersByHand = {
    mainHand: [prepared], offHand: [{ label: 'Off', value: 7 }], bothHands: [{ label: 'Both', value: 15 }],
  };
  return {
    data: {
      title: 'Attack', actor: actor as WeaponAttackRollDialogContext['data']['actor'],
      rollMode: 'publicroll', target: null, wieldedHand: 'mainHand', handBab: { mainHand: 6, offHand: 6, bothHands: 6 },
      attackRoll: { label: 'Attack', immutableModifiersByHand },
      damageRoll: { label: 'Damage', immutableModifiersByHand, situationalModifier: '2' },
      combatModifierToggles: [{
        id: 'condition', group: 'combatStatus', label: 'Same label', tooltip: '', checked: true, wasAutoDetected: true,
        createRollModifiers: (checked, hand) => ({
          attackModifiers: checked ? [{ id: 'condition', label: 'Same label', value: hand === 'offHand' ? -4 : 2 }] : [],
          damageModifiers: [],
        }),
      }, {
        id: 'other', group: 'combatStatus', label: 'Same label', tooltip: '', checked: true, wasAutoDetected: false,
        createRollModifiers: checked => ({ attackModifiers: checked ? [{ id: 'other', label: 'Same label', value: 1 }] : [], damageModifiers: [] }),
      }],
    },
    formulaContext: {}, familiarSchema: {}, resolve: vi.fn(), cancel: vi.fn(),
  };
}

function makeDefenseContext(): RollDialogContext<RollDefenseDialogData, RollDefenseDialogResult> {
  const actorData: Pick<RollDefenseDialogData['actor'], 'name' | 'img' | 'statuses'> & {
    system: { defense: Pick<RollDefenseDialogData['actor']['system']['defense'], 'concealment'> };
  } = {
    name: 'Defender', img: 'icons/svg/mystery-man.svg', statuses: new Set(['charged']),
    system: { defense: { concealment: 20 } },
  };
  const actor = actorData as RollDefenseDialogData['actor'];
  return {
    data: {
      title: 'Defense', actor, attacker: actor, rollMode: 'publicroll', checkMode: 'normal',
      defenseRollByMode: {
        normal: {
          label: 'AC',
          immutableModifiers: [{
            label: 'AC', value: 18,
            breakdown: [{ label: 'Base', value: 10 }, { label: 'Charged', value: -2 }],
          }],
        },
        touch: { label: 'Touch', immutableModifiers: [{ label: 'Touch', value: 12 }] },
      },
      defenderDenyDexToAC: false, defenderDexMod: 3, concealment: '', situationalModifier: '2', covered: 'none',
      damageLabel: 'Damage', damageTotalFormula: '1d8', damageModifierList: [],
      combatModifierToggles: [
        { id: 'charged', group: 'combatStatus', label: 'Charged', tooltip: '', checked: true, value: -2, autoDetected: true },
        { id: 'flatFooted', group: 'combatStatus', label: 'Flat', tooltip: '', checked: false, value: 0, autoDetected: true },
        { id: 'ignoreCriticalHit', group: 'overrides', label: 'Immune', tooltip: '', checked: true, value: 0, autoDetected: true },
      ],
    },
    formulaContext: {}, familiarSchema: {}, resolve: vi.fn(), cancel: vi.fn(),
  };
}

describe('authoritative modifier lists', () => {
  beforeEach(() => {
    class FlatRoll extends Roll {
      override get dice() { return []; }
    }
    vi.stubGlobal('Roll', FlatRoll);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rolls prepared totals, not raw history operations, and only expands history for display', () => {
    const modifiers = [prepared, { label: 'Ignored', value: 90, isIgnored: true }, { label: 'Situation', value: -2 }];
    expect(buildModifiersD20Formula(modifiers, 'Save').formula).toBe('1d20[Save] + 10');
    expect(getDisplayModifiers(modifiers)).toEqual([...prepared.breakdown!, ...modifiers.slice(1)]);
    expect(getModifiersFormula([{ label: 'Zero', value: 0 }])).toBe('0');
  });

  it('initializes checked contributions, replaces them without label matching, and never duplicates toggles', () => {
    const store = useMeleeAttackRollDialogStore(makeAttackContext());
    const condition = store.app.combatStatusModifiers.value[0];
    expect(store.attackRoll.modifiers.value.map(mod => mod.id)).toEqual(['prepared', 'condition', 'other']);
    for (let i = 0; i < 3; i++) {
      store.actions.updateMeleeAttackToggle(condition, false);
      expect(store.attackRoll.modifiers.value.map(mod => mod.id)).toEqual(['prepared', 'other']);
      store.actions.updateMeleeAttackToggle(condition, true);
      expect(store.attackRoll.modifiers.value.map(mod => mod.id)).toEqual(['prepared', 'condition', 'other']);
    }
    store.app.wieldMode.value = 'offHand';
    expect(store.attackRoll.modifiers.value.map(mod => mod.value)).toEqual([7, -4, 1]);
    expect(store.damageRoll.modifiers.value.map(mod => mod.value)).toEqual([7, 2]);
  });

  it('returns a detached final snapshot and explicit zero-penalty choices; cancel does not submit', () => {
    const context = makeAttackContext();
    const store = useMeleeAttackRollDialogStore(context);
    store.actions.cancel();
    expect(context.cancel).toHaveBeenCalledOnce();
    expect(context.resolve).not.toHaveBeenCalled();
    store.actions.roll();
    const result = vi.mocked(context.resolve).mock.calls[0][0];
    expect(result.attackModifiers).toEqual(store.attackRoll.modifiers.value);
    expect(result.combatModifiers).toEqual([{ id: 'condition', checked: true }, { id: 'other', checked: true }]);
    store.actions.updateMeleeAttackToggle(store.app.combatStatusModifiers.value[0], false);
    expect(result.attackModifiers).toHaveLength(3);
  });

  it('reconciles prepared AC once, returns that exact list, and resolves without rereading the defender', async () => {
    const context = makeDefenseContext();
    const store = useRollDefenseDialogStore(context);
    expect(store.app.modifierList.value.map(mod => mod.value)).toEqual([18, 2]);
    store.defense.combatStatusModifiers.value[0].checked = false;
    store.defense.combatStatusModifiers.value[1].checked = true;
    store.defense.covered.value = 'covered';
    expect(store.app.modifierList.value.map(mod => mod.value)).toEqual([17, 4, 2]);
    store.actions.roll();
    const result = vi.mocked(context.resolve).mock.calls[0][0];
    expect(result.concealment).toBe(20);
    expect(result.finalModifiers).toEqual(store.app.modifierList.value);
    result.concealment = 0;
    const evaluation = await evaluateDefense(24, true, 30, result);
    expect(evaluation).toMatchObject({ hit: true, effectiveAc: 23, criticalHit: false });
    expect(evaluation.acBreakdown).toBe(result.finalModifiers);
    store.defense.checkMode.value = 'touch';
    expect(store.app.modifierList.value[0].value).toBe(11);
  });

  it('no-check skips AC and concealment but preserves critical immunity', async () => {
    const context = makeDefenseContext();
    const store = useRollDefenseDialogStore(context);
    store.defense.checkMode.value = 'noCheck';
    store.actions.roll();
    const result = vi.mocked(context.resolve).mock.calls[0][0];
    expect(result.finalModifiers).toEqual([]);
    expect(await evaluateDefense(1, true, null, result)).toMatchObject({
      hit: true, criticalHit: false, effectiveAc: 0, concealmentRoll: null, concealmentPercent: 0,
    });
  });
});
