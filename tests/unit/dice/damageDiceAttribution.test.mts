import { DAMAGE_TYPE_FIRE, DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { CRIT_MARKER_KEY, CRIT_OVERRIDE_EXEMPT, CRIT_OVERRIDE_MULTIPLY } from '@constants/critDiceMarkers.mjs';
import { buildMarkerBag } from '@constants/diceMarkerBag.mjs';
import { DAMAGE_TYPE_MARKER_KEY } from '@constants/typedDamageMarkers.mjs';
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

/** Shorthand for a `$typed(...)`-style marker — one field in the shared bag. */
const typedMarker = (damageType: string) => buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: damageType });

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
      die(6, 2, typedMarker(DAMAGE_TYPE_SLASHING)), op('+'),
      die(6, 1, typedMarker(DAMAGE_TYPE_FIRE)),
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
      die(6, 1, typedMarker(DAMAGE_TYPE_FIRE)),
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
    parsed.set(formula, [die(6, 2, typedMarker(DAMAGE_TYPE_SLASHING))]);

    expect(flavorDamageDiceBySource(formula, 'Crownguard', []).formula).toBe('2d6[Crownguard]');
  });

  it('a crit-marker group resolves without a damage type and without throwing', () => {
    const formula = 'crit-marker';
    parsed.set(formula, [die(6, 1, buildMarkerBag({ [CRIT_MARKER_KEY]: CRIT_OVERRIDE_EXEMPT }))]);

    expect(() => groupDamageDiceBySource(formula, 'Crownguard', [])).not.toThrow();
    expect(groupDamageDiceBySource(formula, 'Crownguard', [])[0]).not.toHaveProperty('damageTypeLabel');
  });

  // The actual fix: a single dice group carrying BOTH a crit override and a damage type —
  // what $critMultiply($typed(...)) / $typed(fire, $critMultiply(...)) produce regardless of
  // nesting order (see diceMarkerBag.mts's module doc).
  it('reads a damage type off a group that ALSO carries a crit override, without losing either', () => {
    const formula = 'crit-and-typed';
    const marker = buildMarkerBag({ [CRIT_MARKER_KEY]: CRIT_OVERRIDE_MULTIPLY, [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_FIRE });
    parsed.set(formula, [die(6, 1, marker)]);

    // Damage type survives for the breakdown row...
    expect(groupDamageDiceBySource(formula, 'Crownguard', [])).toEqual([
      { label: 'Crownguard', formula: '1d6', damageTypeLabel: DAMAGE_TYPE_FIRE },
    ]);
    // ...and the crit override still flips this weapon-owned group to multiplication-eligible
    // (forcedEligible overrides the owner-based default, which would otherwise be eligible
    // anyway here — see the AE-owned case below for the half that actually inverts anything).
    expect(flavorDamageDiceBySource(formula, 'Crownguard', []).exemptDiceIndices).toEqual([]);
  });

  it('a crit-exempt override survives alongside a damage type on an AE-owned (normally-exempt) group', () => {
    const formula = 'crit-and-typed-override';
    const marker = buildMarkerBag({ [CRIT_MARKER_KEY]: CRIT_OVERRIDE_MULTIPLY, [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_FIRE });
    parsed.set(formula, [die(6, 1, marker)]);
    parsed.set('1d6', [die(6, 1)]);

    const { exemptDiceIndices } = flavorDamageDiceBySource(formula, 'Crownguard', [{ effectName: '+1 Flaming', value: '1d6' }]);
    // AE-owned dice default to exempt; $critMultiply inverts that — proving the override (not
    // just the owner-based default) is what's being read back, with the damage type intact too.
    expect(exemptDiceIndices).toEqual([]);
    expect(groupDamageDiceBySource(formula, 'Crownguard', [{ effectName: '+1 Flaming', value: '1d6' }])).toEqual([
      { label: '+1 Flaming', formula: '1d6', damageTypeLabel: DAMAGE_TYPE_FIRE },
    ]);
  });
});
