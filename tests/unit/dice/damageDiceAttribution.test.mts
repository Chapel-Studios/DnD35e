import { DAMAGE_TYPE_FIRE, DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { CRIT_EXEMPT_MARKER } from '@constants/critDiceMarkers.mjs';
import { buildTypedDamageMarker } from '@constants/typedDamageMarkers.mjs';
import { flavorDamageDiceBySource, groupDamageDiceBySource } from '@source/dice/d20Formula.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mirrors tests/unit/dice/splitFormulaParts.test.mts's `Roll.parse`/`foundry.dice.terms`
// stubbing pattern — `parseAdditiveDiceFragment()` (the shared parser behind both functions
// under test) needs real `instanceof Die`/`NumericTerm`/`OperatorTerm` checks to pass.
class OperatorTermStub {
  constructor(readonly operator: string) {}
}
class NumericTermStub {
  constructor(readonly number: number) {}
}
class DieStub {
  modifiers: string[] = [];
  constructor(readonly faces: number, readonly number: number, readonly flavor = '') {}
}

describe('groupDamageDiceBySource/flavorDamageDiceBySource — damage-type attribution (poc.10 Story J)', () => {
  const parsed = new Map<string, unknown[]>();
  const parse = vi.fn((formula: string) => {
    const terms = parsed.get(formula);
    if (!terms) throw new Error(`Invalid formula: ${formula}`);
    return terms;
  });
  const die = (faces: number, count: number, flavor = '') => new DieStub(faces, count, flavor);
  const op = (operator: string) => new OperatorTermStub(operator);

  beforeEach(() => {
    parsed.clear();
    parse.mockClear();
    vi.stubGlobal('Roll', { parse });
    vi.stubGlobal('foundry', {
      dice: { terms: { Die: DieStub, NumericTerm: NumericTermStub, OperatorTerm: OperatorTermStub } },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('splits a single source into separate breakdown rows per damage type', () => {
    const formula = 'typed-multi';
    parsed.set(formula, [
      die(6, 2, buildTypedDamageMarker(DAMAGE_TYPE_SLASHING)), op('+'),
      die(6, 1, buildTypedDamageMarker(DAMAGE_TYPE_FIRE)),
    ]);

    expect(groupDamageDiceBySource(formula, 'Crownguard', [])).toEqual([
      { label: 'Crownguard', formula: '2d6', damageTypeLabel: DAMAGE_TYPE_SLASHING },
      { label: 'Crownguard', formula: '1d6', damageTypeLabel: DAMAGE_TYPE_FIRE },
    ]);
  });

  it('omits damageTypeLabel for untyped dice groups', () => {
    const formula = 'untyped';
    parsed.set(formula, [die(6, 2)]);

    const rows = groupDamageDiceBySource(formula, 'Crownguard', []);
    expect(rows).toEqual([{ label: 'Crownguard', formula: '2d6' }]);
    expect(rows[0]).not.toHaveProperty('damageTypeLabel');
  });

  it('attributes an AE override\'s own typed dice to its effect name, not the weapon', () => {
    const formula = 'weapon-plus-override';
    parsed.set(formula, [
      die(6, 2), op('+'),
      die(6, 1, buildTypedDamageMarker(DAMAGE_TYPE_FIRE)),
    ]);
    // attributeDamageDiceGroups() re-parses each override's own `.value` text separately to
    // count how many dice groups it owns (positional attribution) — register it too.
    parsed.set('1d6', [die(6, 1)]);

    expect(groupDamageDiceBySource(formula, 'Crownguard', [{ effectName: '+1 Flaming', value: '1d6' }])).toEqual([
      { label: 'Crownguard', formula: '2d6' },
      { label: '+1 Flaming', formula: '1d6', damageTypeLabel: DAMAGE_TYPE_FIRE },
    ]);
  });

  it('does not fold damage type into the real roll\'s own source-only flavor', () => {
    const formula = 'typed-real-roll';
    parsed.set(formula, [die(6, 2, buildTypedDamageMarker(DAMAGE_TYPE_SLASHING))]);

    expect(flavorDamageDiceBySource(formula, 'Crownguard', []).formula).toBe('2d6[Crownguard]');
  });

  it('a crit-marker group resolves without a damage type and without throwing', () => {
    const formula = 'crit-marker';
    parsed.set(formula, [die(6, 1, CRIT_EXEMPT_MARKER)]);

    expect(() => groupDamageDiceBySource(formula, 'Crownguard', [])).not.toThrow();
    expect(groupDamageDiceBySource(formula, 'Crownguard', [])[0]).not.toHaveProperty('damageTypeLabel');
  });
});
