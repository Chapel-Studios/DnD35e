import { DAMAGE_TYPE_COLD, DAMAGE_TYPE_FIRE, DAMAGE_TYPE_PIERCING, DAMAGE_TYPE_SLASHING } from '@constants/attacks/damageTypes.mjs';
import { CRIT_MARKER_KEY, CRIT_OVERRIDE_EXEMPT, CRIT_OVERRIDE_MULTIPLY } from '@constants/critDiceMarkers.mjs';
import { buildMarkerBag } from '@constants/diceMarkerBag.mjs';
import { DAMAGE_TYPE_MARKER_KEY, readDamageType } from '@constants/typedDamageMarkers.mjs';
import { combineDiceGroupMarker, flavorDamageDiceBySource, getDamageTypeLabels, groupDamageDiceBySource, groupFlatDamageBySource } from '@source/dice/d20Formula.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mirrors tests/unit/dice/splitFormulaParts.test.mts's `Roll.parse`/`foundry.dice.terms`
// stubbing pattern — `parseFormulaComponents()` (the shared parser behind both functions under
// test) needs real `instanceof Die`/`NumericTerm`/`OperatorTerm`/`ParentheticalTerm` checks, plus
// `.isDeterministic`/`.expression`, to pass.
class OperatorTermStub {
  readonly isDeterministic = true;
  constructor(readonly operator: string) {}
}
class NumericTermStub {
  readonly isDeterministic = true;
  constructor(readonly number: number, readonly flavor = '') {}
  get expression(): string { return String(this.number); }
  get formula(): string { return `${this.expression}${this.flavor ? `[${this.flavor}]` : ''}`; }
}
class DieStub {
  readonly isDeterministic = false;
  constructor(readonly faces: number, readonly number: number, readonly flavor = '', readonly modifiers: string[] = []) {}
  get expression(): string { return `${this.number}d${this.faces}${this.modifiers.join('')}`; }
  get formula(): string { return `${this.expression}${this.flavor ? `[${this.flavor}]` : ''}`; }
}
class ParentheticalTermStub {
  readonly isDeterministic = false;
  constructor(readonly term: string, readonly flavor = '') {}
  get expression(): string { return `(${this.term})`; }
  get formula(): string { return `${this.expression}${this.flavor ? `[${this.flavor}]` : ''}`; }
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
  const die = (faces: number, count: number, flavor = '', modifiers: string[] = []) => new DieStub(faces, count, flavor, modifiers);
  const num = (value: number, flavor = '') => new NumericTermStub(value, flavor);
  const op = (operator: string) => new OperatorTermStub(operator);

  beforeEach(() => {
    parsed.clear();
    parse.mockClear();
    // A real `Roll.safeEval()`-equivalent — needed now that a fully deterministic glued group
    // (e.g. "2 * 3") gets pre-evaluated via `Roll.safeEval()` instead of wrapped in a
    // parenthetical (see d20Formula.mts's `parseFormulaComponents()`, item #1).
    vi.stubGlobal('Roll', { parse, safeEval: (expr: string) => Function(`"use strict"; return (${expr});`)() });
    vi.stubGlobal('foundry', {
      dice: { terms: { Die: DieStub, NumericTerm: NumericTermStub, OperatorTerm: OperatorTermStub, ParentheticalTerm: ParentheticalTermStub } },
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

  it('a crit-multiply override survives alongside a damage type on an AE-owned (normally-exempt) group', () => {
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

  // defaultDamageTypes — the dropdown-driven implicit wrap: a weapon's own untyped dice
  // inherit every type selected on the weapon; an AE's untyped dice do not.
  describe('defaultDamageTypes fallback', () => {
    it('falls back to defaultDamageTypes for an untyped weapon-owned group', () => {
      const formula = 'untyped-weapon-default';
      parsed.set(formula, [die(6, 2)]);

      expect(groupDamageDiceBySource(formula, 'Crownguard', [], [DAMAGE_TYPE_SLASHING])).toEqual([
        { label: 'Crownguard', formula: '2d6', damageTypeLabel: DAMAGE_TYPE_SLASHING },
      ]);
    });

    it('does not apply defaultDamageTypes to an untyped AE-contributed group', () => {
      const formula = 'untyped-override-default';
      parsed.set(formula, [die(6, 2), op('+'), die(6, 1)]);
      parsed.set('1d6', [die(6, 1)]);

      const rows = groupDamageDiceBySource(formula, 'Crownguard', [{ effectName: '+1 Flaming', value: '1d6' }], [DAMAGE_TYPE_SLASHING]);
      expect(rows).toEqual([
        { label: 'Crownguard', formula: '2d6', damageTypeLabel: DAMAGE_TYPE_SLASHING },
        { label: '+1 Flaming', formula: '1d6' },
      ]);
      expect(rows[1]).not.toHaveProperty('damageTypeLabel');
    });

    it('an explicit $typed() marker on the weapon\'s own dice wins over defaultDamageTypes', () => {
      const formula = 'explicit-beats-default';
      parsed.set(formula, [die(6, 2, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(groupDamageDiceBySource(formula, 'Crownguard', [], [DAMAGE_TYPE_SLASHING])).toEqual([
        { label: 'Crownguard', formula: '2d6', damageTypeLabel: DAMAGE_TYPE_FIRE },
      ]);
    });

    it('falls back to EVERY selected type for an untyped weapon-owned group (multi-choice weapon)', () => {
      const formula = 'untyped-weapon-multi-default';
      parsed.set(formula, [die(6, 2)]);

      expect(groupDamageDiceBySource(formula, 'Crownguard', [], [DAMAGE_TYPE_PIERCING, DAMAGE_TYPE_SLASHING])).toEqual([
        { label: 'Crownguard', formula: '2d6', damageTypeLabel: `${DAMAGE_TYPE_PIERCING} + ${DAMAGE_TYPE_SLASHING}` },
      ]);
    });

    it('does not fold defaultDamageTypes into the real roll\'s own source-only flavor', () => {
      const formula = 'default-real-roll';
      parsed.set(formula, [die(6, 2)]);

      expect(flavorDamageDiceBySource(formula, 'Crownguard', [], [DAMAGE_TYPE_SLASHING]).formula).toBe('2d6[Crownguard]');
    });
  });

  // Glued multiplicative/divisive groups (e.g. "1d6 * 2") resolve to ONE effective type-SET for
  // the whole group rather than each term keeping its own — unlike a "+"/"-" boundary, there's
  // no way to split credit for a product. Unlike a crit override (a discrete either/or choice),
  // damage types on both sides of the glue COMBINE — a weapon dealing both Fire and Cold is a
  // real, intended "and", not a conflict to resolve by picking a winner.
  describe('glued multiplicative/divisive groups — damage types combine', () => {
    it('uses the anchor die\'s own type when only the die is explicitly typed (1d6[slashing] * 2)', () => {
      const formula = 'mult-anchor-typed';
      parsed.set(formula, [die(6, 1, typedMarker(DAMAGE_TYPE_SLASHING)), op('*'), num(2)]);

      expect(groupDamageDiceBySource(formula, 'Crownguard', [])).toEqual([
        { label: 'Crownguard', formula: '1d6 * 2', damageTypeLabel: DAMAGE_TYPE_SLASHING },
      ]);
    });

    it('uses the multiplier\'s own type when only the multiplier is explicitly typed (1d6 * 1[fire])', () => {
      const formula = 'mult-multiplier-typed';
      parsed.set(formula, [die(6, 1), op('*'), num(1, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(groupDamageDiceBySource(formula, 'Crownguard', [])).toEqual([
        { label: 'Crownguard', formula: '1d6 * 1', damageTypeLabel: DAMAGE_TYPE_FIRE },
      ]);
    });

    it('combines both types when the anchor and multiplier are typed differently (1d6[slashing] * 1[fire])', () => {
      const formula = 'mult-conflict-typed';
      parsed.set(formula, [die(6, 1, typedMarker(DAMAGE_TYPE_SLASHING)), op('*'), num(1, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(groupDamageDiceBySource(formula, 'Crownguard', [])).toEqual([
        { label: 'Crownguard', formula: '1d6 * 1', damageTypeLabel: `${DAMAGE_TYPE_SLASHING} + ${DAMAGE_TYPE_FIRE}` },
      ]);
    });

    it('keeps the common single-anchor case crit-eligible (no parenthesis-wrapping)', () => {
      const formula = 'mult-crit-eligible';
      parsed.set(formula, [die(6, 1, typedMarker(DAMAGE_TYPE_FIRE)), op('*'), num(2)]);

      // Weapon-owned, not forced either way -> not exempt, same as any other weapon die.
      expect(flavorDamageDiceBySource(formula, 'Crownguard', []).exemptDiceIndices).toEqual([]);
    });
  });

  it('reads a damage type off a Die with roll modifiers (e.g. 4d6kh3) without losing crit eligibility', () => {
    const formula = 'modified-dice-typed';
    parsed.set(formula, [die(6, 4, typedMarker(DAMAGE_TYPE_FIRE), ['kh3'])]);

    expect(groupDamageDiceBySource(formula, 'Crownguard', [])).toEqual([
      { label: 'Crownguard', formula: '4d6kh3', damageTypeLabel: DAMAGE_TYPE_FIRE },
    ]);
    expect(flavorDamageDiceBySource(formula, 'Crownguard', []).exemptDiceIndices).toEqual([]);
  });

  it('keeps crit-index alignment when a flat (non-dice) override sits between two dice sources', () => {
    const formula = 'mixed-flat-and-dice-override';
    parsed.set(formula, [
      die(6, 2), op('+'),
      num(1), op('+'),
      die(6, 1, typedMarker(DAMAGE_TYPE_FIRE)),
    ]);
    parsed.set('1', [num(1)]);
    parsed.set('1d6', [die(6, 1)]);
    const overrides = [
      { effectName: 'Strength Bonus', value: '1' },
      { effectName: '+1 Flaming', value: '1d6' },
    ];

    // The flat "Strength Bonus" component must not consume a crit-index slot — the AE dice
    // group is still the SECOND real Die encountered (index 1), not the third.
    expect(flavorDamageDiceBySource(formula, 'Crownguard', overrides).exemptDiceIndices).toEqual([1]);
    // groupDamageDiceBySource stays dice-only — the flat override contributes no row at all.
    expect(groupDamageDiceBySource(formula, 'Crownguard', overrides)).toEqual([
      { label: 'Crownguard', formula: '2d6' },
      { label: '+1 Flaming', formula: '1d6', damageTypeLabel: DAMAGE_TYPE_FIRE },
    ]);
  });

  // Regression for the "zero-valued override steals the preceding component" bug (PR #102,
  // second review wave, item #2): `appendRollFormulaTerm()` is a no-op for a blank/'0' override
  // value, so a zero-valued override contributes ZERO components to the real combined formula.
  // The backward ownership walk must skip it entirely, not consume a cursor slot for it.
  it('does not misattribute the weapon\'s own component to a zero-valued override', () => {
    const formula = 'weapon-plus-zero-plus-flaming';
    // Only 2 real components ever reach the combined formula — the zero override never
    // appended anything.
    parsed.set(formula, [die(6, 2), op('+'), die(6, 1, typedMarker(DAMAGE_TYPE_FIRE))]);
    parsed.set('0', [num(0)]);
    parsed.set('1d6', [die(6, 1)]);
    const overrides = [
      { effectName: 'Disabled Bonus', value: '0' },
      { effectName: '+1 Flaming', value: '1d6' },
    ];

    // The weapon's own 2d6 stays weapon-owned (not exempt), not stolen by "Disabled Bonus".
    expect(flavorDamageDiceBySource(formula, 'Crownguard', overrides).exemptDiceIndices).toEqual([1]);
    expect(groupDamageDiceBySource(formula, 'Crownguard', overrides)).toEqual([
      { label: 'Crownguard', formula: '2d6' },
      { label: '+1 Flaming', formula: '1d6', damageTypeLabel: DAMAGE_TYPE_FIRE },
    ]);
  });

  // The fix for the "$typed(fire, 3) loses its type entirely" gap (poc.10 Story J, item #4):
  // combineDiceGroupMarker() now applies to EVERY component, not just dice-shaped ones.
  it('attaches a damage-type marker to a wholly flat numeric component, not just dice groups', () => {
    const formula = '3';
    parsed.set(formula, [num(3)]);

    const flavored = combineDiceGroupMarker(formula, DAMAGE_TYPE_MARKER_KEY, DAMAGE_TYPE_FIRE);
    const match = /^3\[(.+)\]$/.exec(flavored);
    expect(match).not.toBeNull();
    expect(readDamageType(match?.[1])).toEqual([DAMAGE_TYPE_FIRE]);
  });

  // getDamageTypeLabels()/collectDamageTypes() — the generic building block any consumer
  // (sheet rows, tooltips, chat summaries, damage-event metadata) can reuse for "what types
  // does this formula produce", deduped at the canonical type level across every component —
  // dice AND flat alike (PR #102, items #6/#12).
  describe('getDamageTypeLabels', () => {
    it('returns one deduped label per distinct type, in first-appearance order', () => {
      const formula = 'labels-multi-type';
      parsed.set(formula, [
        die(6, 2, typedMarker(DAMAGE_TYPE_SLASHING)), op('+'),
        die(6, 1, typedMarker(DAMAGE_TYPE_FIRE)),
      ]);

      expect(getDamageTypeLabels(formula, [])).toEqual([DAMAGE_TYPE_SLASHING, DAMAGE_TYPE_FIRE]);
    });

    it('dedupes the same type contributed by two different sources', () => {
      const formula = 'labels-same-type-two-sources';
      parsed.set(formula, [
        die(6, 2, typedMarker(DAMAGE_TYPE_FIRE)), op('+'),
        die(6, 1, typedMarker(DAMAGE_TYPE_FIRE)),
      ]);
      parsed.set('1d6', [die(6, 1, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(getDamageTypeLabels(formula, [{ effectName: '+1 Flaming', value: '1d6' }])).toEqual([DAMAGE_TYPE_FIRE]);
    });

    it('omits an untyped AE-contributed component instead of borrowing defaultDamageTypes', () => {
      const formula = 'labels-untyped-override';
      parsed.set(formula, [die(6, 2), op('+'), die(6, 1)]);
      parsed.set('1d6', [die(6, 1)]);

      expect(getDamageTypeLabels(formula, [{ effectName: '+1 Flaming', value: '1d6' }], [DAMAGE_TYPE_SLASHING]))
        .toEqual([DAMAGE_TYPE_SLASHING]);
    });

    it('returns an empty array when nothing could be typed at all', () => {
      const formula = 'labels-empty';
      parsed.set(formula, [die(6, 2), op('+'), die(6, 1)]);
      parsed.set('1d6', [die(6, 1)]);

      expect(getDamageTypeLabels(formula, [{ effectName: '+1 Flaming', value: '1d6' }])).toEqual([]);
    });

    it('includes a flat $typed() component\'s type, mixed alongside dice', () => {
      // PR #102, item #6: "1d6 + $typed(fire, 3)" previously showed only the weapon's default
      // dice type, with the flat Fire component silently dropped.
      const formula = 'labels-flat-mixed-with-dice';
      parsed.set(formula, [die(6, 1), op('+'), num(3, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(getDamageTypeLabels(formula, [], [DAMAGE_TYPE_SLASHING])).toEqual([DAMAGE_TYPE_SLASHING, DAMAGE_TYPE_FIRE]);
    });

    it('includes a wholly flat $typed() component\'s type when there is no dice at all', () => {
      // PR #102, item #6: "a purely flat $typed(fire, 3) shows no type at all" previously.
      const formula = 'labels-wholly-flat';
      parsed.set(formula, [num(3, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(getDamageTypeLabels(formula, [])).toEqual([DAMAGE_TYPE_FIRE]);
    });

    it('dedupes at the canonical type level, not the joined-label-string level', () => {
      // PR #102, item #12: a Piercing+Slashing weapon (dagger-style) with an EXTRA
      // $typed(piercing, 1d4) component previously rendered "Piercing + Slashing + Piercing" —
      // two distinct joined-label strings ("Piercing + Slashing" and "Piercing"), even though
      // "Piercing" itself is only one type.
      const formula = 'labels-dedupe-across-groups';
      parsed.set(formula, [die(6, 2), op('+'), die(4, 1, typedMarker(DAMAGE_TYPE_PIERCING))]);

      expect(getDamageTypeLabels(formula, [], [DAMAGE_TYPE_PIERCING, DAMAGE_TYPE_SLASHING]))
        .toEqual([DAMAGE_TYPE_PIERCING, DAMAGE_TYPE_SLASHING]);
    });
  });

  // groupFlatDamageBySource() — PR #102, item #6's "flat modifier rows" half (a flat $typed()
  // component previously had no type attribution anywhere in the roll breakdown UI) AND the
  // third review wave's "distinct typed sources must not combine into one row" fix.
  describe('groupFlatDamageBySource', () => {
    it('attaches a type label to the weapon\'s own flat component, keyed by its label', () => {
      const formula = 'flat-labels-weapon-owned';
      parsed.set(formula, [die(6, 1), op('+'), num(3, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(groupFlatDamageBySource(formula, 'Crownguard', [])).toEqual([
        { label: 'Crownguard', value: 3, damageTypeLabel: DAMAGE_TYPE_FIRE },
      ]);
    });

    it('attaches a type label to an AE override\'s own flat component, keyed by its effect name', () => {
      const formula = 'flat-labels-ae-owned';
      parsed.set(formula, [die(6, 2), op('+'), num(3, typedMarker(DAMAGE_TYPE_FIRE))]);
      parsed.set('3', [num(3, typedMarker(DAMAGE_TYPE_FIRE))]);

      const rows = groupFlatDamageBySource(formula, 'Crownguard', [{ effectName: '+1 Flaming', value: '3' }]);
      expect(rows).toEqual([{ label: '+1 Flaming', value: 3, damageTypeLabel: DAMAGE_TYPE_FIRE }]);
    });

    it('includes an untyped flat component with no damageTypeLabel at all', () => {
      const formula = 'flat-labels-untyped';
      parsed.set(formula, [die(6, 1), op('+'), num(3)]);

      expect(groupFlatDamageBySource(formula, 'Crownguard', [])).toEqual([{ label: 'Crownguard', value: 3 }]);
    });

    it('keeps two distinct typed flat components as separate rows instead of combining them into one misleading total', () => {
      // PR #102, third review wave: "$typed(fire, 3) + $typed(cold, 4)" previously summed
      // into one "+7 (Fire + Cold)" row, wrongly implying all 7 points carry both types.
      const formula = 'flat-distinct-types';
      parsed.set(formula, [num(3, typedMarker(DAMAGE_TYPE_FIRE)), op('+'), num(4, typedMarker(DAMAGE_TYPE_COLD))]);

      expect(groupFlatDamageBySource(formula, 'Crownguard', [])).toEqual([
        { label: 'Crownguard', value: 3, damageTypeLabel: DAMAGE_TYPE_FIRE },
        { label: 'Crownguard', value: 4, damageTypeLabel: DAMAGE_TYPE_COLD },
      ]);
    });

    it('sums same-typed flat components from the same source into one row', () => {
      const formula = 'flat-same-type-sums';
      parsed.set(formula, [num(3, typedMarker(DAMAGE_TYPE_FIRE)), op('+'), num(4, typedMarker(DAMAGE_TYPE_FIRE))]);

      expect(groupFlatDamageBySource(formula, 'Crownguard', [])).toEqual([
        { label: 'Crownguard', value: 7, damageTypeLabel: DAMAGE_TYPE_FIRE },
      ]);
    });
  });

  // PR #102, second review wave, items #1 and #5: glued multiplicative/divisive groups.
  describe('glued multiplicative groups', () => {
    it('pre-evaluates a fully deterministic product so it stays a visible flat term, not a crit-invisible parenthetical', () => {
      const formula = 'deterministic-product';
      parsed.set(formula, [num(2), op('*'), num(3)]);

      // "6", not "(2 * 3)" — a parenthetical wrapper is invisible to DamageRoll#evaluateCritical().
      expect(flavorDamageDiceBySource(formula, 'Crownguard', []).formula).toBe('6[Crownguard]');
    });

    it('folds every flavored multiplier\'s type into one combined group, not just the first one found', () => {
      const formula = 'one-anchor-two-typed-multipliers';
      parsed.set(formula, [
        die(6, 1), op('*'), num(2, typedMarker(DAMAGE_TYPE_FIRE)), op('*'), num(3, typedMarker(DAMAGE_TYPE_COLD)),
      ]);

      expect(groupDamageDiceBySource(formula, 'Crownguard', [])).toEqual([
        { label: 'Crownguard', formula: '1d6 * 2 * 3', damageTypeLabel: `${DAMAGE_TYPE_FIRE} + ${DAMAGE_TYPE_COLD}` },
      ]);
    });

    it('folds both real dice terms\' types when two non-deterministic terms are glued together', () => {
      const formula = 'two-typed-dice-terms';
      parsed.set(formula, [
        die(6, 1, typedMarker(DAMAGE_TYPE_FIRE)), op('*'), die(4, 1, typedMarker(DAMAGE_TYPE_COLD)),
      ]);

      // getDamageTypeLabels() now dedupes at the canonical TYPE level, not the joined-label-
      // string level — each type is its own entry, matching getDamageTypeLabels()'s other
      // multi-type cases (callers join with " + " themselves).
      expect(getDamageTypeLabels(formula, [])).toEqual([DAMAGE_TYPE_FIRE, DAMAGE_TYPE_COLD]);
    });
  });
});
