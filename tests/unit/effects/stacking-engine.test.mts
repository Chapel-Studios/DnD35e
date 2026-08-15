import {
  BONUS_TYPE_BROKEN as BROKEN,
  BONUS_TYPE_ENHANCEMENT as ENHANCEMENT,
  BONUS_TYPE_MATERIAL as MATERIAL,
  BONUS_TYPE_UNTYPED as UNTYPED,
} from '@constants/bonusTypes.mjs';
import type { StackingChange } from '@helpers/stacking.mjs';
import { parseNumericChangeValue, resolveActiveEffectChanges } from '@helpers/stacking.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Helper: build a StackingChange with sensible defaults so tests stay short.
 */
function mkChange (partial: Partial<StackingChange> & Pick<StackingChange, 'index' | 'field' | 'value'>): StackingChange {
  return {
    bonusType: undefined,
    source: `effect-${partial.index}`,
    ...partial,
  };
}

describe('parseNumericChangeValue', () => {
  it('returns numbers as-is', () => {
    expect(parseNumericChangeValue(5)).toBe(5);
    expect(parseNumericChangeValue(-3)).toBe(-3);
    expect(parseNumericChangeValue(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(parseNumericChangeValue('5')).toBe(5);
    expect(parseNumericChangeValue('-2')).toBe(-2);
  });

  it('parses numeric strings with surrounding whitespace', () => {
    expect(parseNumericChangeValue(' 3 ')).toBe(3);
    expect(parseNumericChangeValue('\t-1\n')).toBe(-1);
  });

  it('returns NaN for empty / whitespace-only strings', () => {
    expect(parseNumericChangeValue('')).toBeNaN();
    expect(parseNumericChangeValue('   ')).toBeNaN();
  });

  it('returns NaN for formula-like strings', () => {
    expect(parseNumericChangeValue('1d6')).toBeNaN();
    expect(parseNumericChangeValue('@abilities.str.mod')).toBeNaN();
  });

  it('returns NaN for non-string non-number inputs (objects, MASK payloads)', () => {
    // MASK changes can carry arbitrary objects as values. parseNumericChangeValue
    // is what gates them out of numeric stacking — callers (ItemDnd35e) filter on
    // !isNaN(value) before passing to the engine.
    expect(parseNumericChangeValue({ foo: 'bar' })).toBeNaN();
    expect(parseNumericChangeValue([1, 2, 3])).toBeNaN();
    expect(parseNumericChangeValue(true)).toBeNaN();
    expect(parseNumericChangeValue(null)).toBeNaN();
    expect(parseNumericChangeValue(undefined)).toBeNaN();
  });
});

describe('resolveActiveEffectChanges — basic stacking rules', () => {
  it('empty input → empty winners + empty history', () => {
    const result = resolveActiveEffectChanges([]);
    expect(result.winners).toEqual([]);
    expect(result.history).toEqual([]);
  });

  it('same-type bonus: highest value wins, lower goes to history as ignored', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.hardness', bonusType: MATERIAL, value: 10, source: 'Steel' }),
      mkChange({ index: 1, field: 'system.hardness', bonusType: MATERIAL, value: 8, source: 'Iron' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);

    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 10, source: 'Steel', reason: 'highest' });

    expect(history).toHaveLength(2);
    const steelEntry = history.find(h => h.source === 'Steel')!;
    const ironEntry = history.find(h => h.source === 'Iron')!;
    expect(steelEntry.applied).toBe(true);
    expect(ironEntry.applied).toBe(false);
    expect(ironEntry.bonusType).toBe(MATERIAL);
    expect(ironEntry.rejection).toMatch(/lower\s*bonus/i);
  });

  it('untyped bonuses all stack (sum)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: undefined, value: 2, source: 'A' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: undefined, value: 3, source: 'B' }),
      mkChange({ index: 2, field: 'system.attack', bonusType: undefined, value: 1, source: 'C' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);

    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 6, reason: 'untyped-stack' });

    expect(history).toHaveLength(3);
    expect(history.every(h => h.applied)).toBe(true);
  });

  it('penalties always apply (one penalty in a group)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: -2, source: 'Broken' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);

    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: -2, reason: 'penalty' });
    expect(history[0].applied).toBe(true);
  });
});

describe('resolveActiveEffectChanges — multi-field / multi-type', () => {
  it('per-field independence: same bonusType on different fields does not interfere', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 2, source: 'A' }),
      mkChange({ index: 1, field: 'system.damage', bonusType: MATERIAL, value: 3, source: 'B' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);

    expect(winners).toHaveLength(2);
    const attackWinner = winners.find(w => w.source === 'A')!;
    const damageWinner = winners.find(w => w.source === 'B')!;
    expect(attackWinner.value).toBe(2);
    expect(damageWinner.value).toBe(3);
  });

  it('untyped + named on same field coexist (untyped sums, named picks highest, both apply)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 5, source: 'Steel' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: 3, source: 'Iron' }),
      mkChange({ index: 2, field: 'system.attack', bonusType: undefined, value: 1, source: 'Misc-A' }),
      mkChange({ index: 3, field: 'system.attack', bonusType: undefined, value: 2, source: 'Misc-B' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);

    expect(winners).toHaveLength(2);
    const materialWinner = winners.find(w => w.bonusType === MATERIAL)!;
    const untypedWinner = winners.find(w => w.bonusType === UNTYPED)!;
    expect(materialWinner).toMatchObject({ value: 5, source: 'Steel', reason: 'highest' });
    expect(untypedWinner).toMatchObject({ value: 3, reason: 'untyped-stack' });
  });

  it('mixed scenario: typed bonus + untyped bonus + penalty on same field → correct totals', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 4, source: 'Mat-A' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: 2, source: 'Mat-B' }),
      mkChange({ index: 2, field: 'system.attack', bonusType: undefined, value: 1, source: 'Untyped' }),
      mkChange({ index: 3, field: 'system.attack', bonusType: BROKEN, value: -1, source: 'Broken' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);

    // material highest (4), untyped sum (1), penalty -1 — three winners total
    expect(winners).toHaveLength(3);
    const sum = winners.reduce((acc, w) => acc + w.value, 0);
    expect(sum).toBe(4 + 1 + -1);
  });
});

describe('resolveActiveEffectChanges — history tracking', () => {
  it('every input change appears in history exactly once', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 5, source: 'A' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: 3, source: 'B' }),
      mkChange({ index: 2, field: 'system.damage', bonusType: undefined, value: 2, source: 'C' }),
    ];

    const { history } = resolveActiveEffectChanges(changes);
    const indices = history.map(h => h.changeIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  it('rejected entries carry a non-empty rejection reason; applied entries have no rejection', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 5, source: 'Win' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: 3, source: 'Lose' }),
    ];

    const { history } = resolveActiveEffectChanges(changes);
    const win = history.find(h => h.source === 'Win')!;
    const lose = history.find(h => h.source === 'Lose')!;

    expect(win.applied).toBe(true);
    expect(win.rejection).toBeUndefined();

    expect(lose.applied).toBe(false);
    expect(lose.rejection).toBeTruthy();
    expect(typeof lose.rejection).toBe('string');
  });
});

describe('resolveActiveEffectChanges — dual-stack (excludeEffectIds)', () => {
  it('excluding an effect changes the per-field resolution', () => {
    const changes: StackingChange[] = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 5, source: 'Hidden', effectId: 'hidden-1' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: 3, source: 'Visible', effectId: 'visible-1' }),
    ];

    const realStack = resolveActiveEffectChanges(changes);
    const maskedStack = resolveActiveEffectChanges(changes, new Set(['hidden-1']));

    // Real stack: Hidden wins with value 5
    expect(realStack.winners).toHaveLength(1);
    expect(realStack.winners[0]).toMatchObject({ source: 'Hidden', value: 5 });

    // Masked stack: Hidden excluded, Visible wins with value 3
    expect(maskedStack.winners).toHaveLength(1);
    expect(maskedStack.winners[0]).toMatchObject({ source: 'Visible', value: 3 });
  });

  it('excluded effects surface in history with a mask-related rejection', () => {
    const changes: StackingChange[] = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 5, source: 'Hidden', effectId: 'hidden-1' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: 3, source: 'Visible', effectId: 'visible-1' }),
    ];

    const { history } = resolveActiveEffectChanges(changes, new Set(['hidden-1']));
    const hidden = history.find(h => h.source === 'Hidden')!;
    expect(hidden.applied).toBe(false);
    expect(hidden.rejection).toMatch(/mask|exclud/i);
  });
});

describe('resolveActiveEffectChanges — MASK changes upstream filter', () => {
  // MASK-mode AE changes are filtered out by ItemDnd35e.applyActiveEffects() BEFORE
  // they reach the stacking engine. The engine sees pre-parsed StackingChange values
  // only — MASK payloads (objects, strings) are gated by parseNumericChangeValue
  // returning NaN, then dropped by the !isNaN filter at the call site.
  //
  // This test documents that contract: non-numeric values, if they did reach the
  // engine, produce a coherent (empty) result rather than a thrown error.
  it('NaN-valued changes pass through without crashing (defensive)', () => {
    const changes: StackingChange[] = [
      mkChange({ index: 0, field: 'system.name', bonusType: MATERIAL, value: Number.NaN, source: 'MaskedName' }),
    ];

    expect(() => resolveActiveEffectChanges(changes)).not.toThrow();
  });
});

// TODO(test): dodge, circumstance, racial bonus types — added when phases that
// introduce them land (dodge: alpha.4 Feats; circumstance/racial: TBD).
// Project policy (per community-expert consensus): these three types stack like
// untyped — both bonuses and penalties sum together rather than the
// best-bonus + worst-penalty rule used by other named types.
// When adding each type:
//   1. Add the constant to src/constants/bonusTypes.mts
//   2. Add the type to STACKING_BONUS_TYPES in src/helpers/stacking.mts
//   3. Add a test below mirroring the untyped-stack tests for that type

// ---------------------------------------------------------------------------
// RAW coverage — D&D 3.5 SRD Glossary § Stacking:
//
//   "In most cases, modifiers to a given check or roll stack if they come from
//    different sources and have different types (or no type at all), but do not
//    stack if they have the same type or come from the same source.
//    If the modifiers to a particular roll do not stack, only the best bonus
//    and worst penalty applies. Dodge bonuses and circumstance bonuses
//    however, do stack with one another unless otherwise specified."
//
// Source: docs/reference/fvtt-JournalEntry-3.5-srd-working-…json (Glossary)
// Mirrored at d20srd.org/srd/theBasics.htm
// ---------------------------------------------------------------------------

describe('SRD non-stacking type: best bonus + worst penalty both apply', () => {
  it('user wisdom scenario: +2, +4, -2, -4 same type → +4 + -4 = 0', () => {
    // helm +2 enhancement, necklace +4 enhancement, drunk -2 enhancement,
    // confused -4 enhancement → SRD: best bonus (+4) + worst penalty (-4) = 0.
    const changes = [
      mkChange({ index: 0, field: 'system.abilities.wis', bonusType: MATERIAL, value: 2, source: 'Helm' }),
      mkChange({ index: 1, field: 'system.abilities.wis', bonusType: MATERIAL, value: 4, source: 'Necklace' }),
      mkChange({ index: 2, field: 'system.abilities.wis', bonusType: MATERIAL, value: -2, source: 'Drunk' }),
      mkChange({ index: 3, field: 'system.abilities.wis', bonusType: MATERIAL, value: -4, source: 'Confused' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);

    expect(winners).toHaveLength(2);
    const bonus = winners.find(w => w.reason === 'highest')!;
    const penalty = winners.find(w => w.reason === 'penalty')!;
    expect(bonus).toMatchObject({ value: 4, source: 'Necklace' });
    expect(penalty).toMatchObject({ value: -4, source: 'Confused' });

    const total = winners.reduce((acc, w) => acc + w.value, 0);
    expect(total).toBe(0);

    // Losers carry typed rejection reasons
    const helmRow = history.find(h => h.source === 'Helm')!;
    const drunkRow = history.find(h => h.source === 'Drunk')!;
    expect(helmRow.applied).toBe(false);
    expect(helmRow.rejection).toMatch(/lower\s*bonus/i);
    expect(drunkRow.applied).toBe(false);
    expect(drunkRow.rejection).toMatch(/less\s*severe/i);
  });

  it('all positive same type → highest wins, no penalty winner', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 3, source: 'A' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 5, source: 'B' }),
      mkChange({ index: 2, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 1, source: 'C' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 5, source: 'B', reason: 'highest' });
  });

  it('all negative same type → worst penalty wins, no bonus winner', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: -1, source: 'Light' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: -3, source: 'Heavy' }),
      mkChange({ index: 2, field: 'system.defense.armorClass', bonusType: MATERIAL, value: -2, source: 'Medium' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: -3, source: 'Heavy', reason: 'penalty' });

    // The less-severe penalties are rejected, not "applied as penalty"
    const lightRow = history.find(h => h.source === 'Light')!;
    expect(lightRow.applied).toBe(false);
    expect(lightRow.rejection).toMatch(/less\s*severe/i);
  });

  it('single penalty alone → applies as penalty winner with reason "penalty"', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: BROKEN, value: -2, source: 'Broken' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: -2, reason: 'penalty', source: 'Broken' });
  });

  it('bonus + penalty of same type both apply (mixed pair)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 3, source: 'Bonus' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: -1, source: 'Penalty' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(2);
    const sum = winners.reduce((acc, w) => acc + w.value, 0);
    expect(sum).toBe(2);
  });

  it('multiple penalties same type: only worst applies, others rejected', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.save', bonusType: MATERIAL, value: -1, source: 'Mild' }),
      mkChange({ index: 1, field: 'system.save', bonusType: MATERIAL, value: -2, source: 'Mid' }),
      mkChange({ index: 2, field: 'system.save', bonusType: MATERIAL, value: -5, source: 'Severe' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: -5, source: 'Severe' });

    const rejected = history.filter(h => !h.applied);
    expect(rejected).toHaveLength(2);
    for (const r of rejected) {
      expect(r.rejection).toMatch(/less\s*severe/i);
    }
  });

  it('tied bonuses: deterministic — first encountered wins', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 4, source: 'First' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 4, source: 'Second' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 4, source: 'First' });
  });

  it('tied penalties: deterministic — first encountered wins', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: -3, source: 'First' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: -3, source: 'Second' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: -3, source: 'First' });
  });

  it('zero-valued change in a named-type group is recorded but does not win', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 0, source: 'Zero' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 3, source: 'Pos' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 3, source: 'Pos' });
    const zeroRow = history.find(h => h.source === 'Zero')!;
    expect(zeroRow.applied).toBe(false);
    expect(zeroRow.rejection).toMatch(/zero\s*value|lower\s*bonus/i);
  });
});

describe('SRD cross-type combinations on the same field', () => {
  it('different named types all apply (each picks its own best)', () => {
    // Phase-2 only has material/broken/enhancment; future phases (enhancement,
    // armor, deflection, …) all behave the same way under SRD: different types
    // stack with each other; same type does not.
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 2, source: 'Mat' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: ENHANCEMENT, value: 1, source: 'MW' }),
      mkChange({ index: 2, field: 'system.defense.armorClass', bonusType: BROKEN, value: -2, source: 'Broken' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(3);
    const total = winners.reduce((acc, w) => acc + w.value, 0);
    expect(total).toBe(1); // 2 + 1 + -2
  });

  it('same value (+5) in two different types: both apply (cross-type stack)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 5, source: 'Mat' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: ENHANCEMENT, value: 5, source: 'MW' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(2);
    const total = winners.reduce((acc, w) => acc + w.value, 0);
    expect(total).toBe(10);
  });

  it('comprehensive: typed bonus + typed penalty + untyped both signs', () => {
    // material bonuses, material penalties (best+worst), enhancment bonus,
    // untyped mixed → sum across types.
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 4, source: 'Mat-Best' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: 2, source: 'Mat-Low' }),
      mkChange({ index: 2, field: 'system.attack', bonusType: MATERIAL, value: -3, source: 'Mat-Worst' }),
      mkChange({ index: 3, field: 'system.attack', bonusType: MATERIAL, value: -1, source: 'Mat-Mild' }),
      mkChange({ index: 4, field: 'system.attack', bonusType: ENHANCEMENT, value: 1, source: 'MW' }),
      mkChange({ index: 5, field: 'system.attack', bonusType: undefined, value: 3, source: 'Untyped+' }),
      mkChange({ index: 6, field: 'system.attack', bonusType: undefined, value: -1, source: 'Untyped-' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    const total = winners.reduce((acc, w) => acc + w.value, 0);
    // material: best +4, worst -3 (sum +1)
    // enhancment: +1
    // untyped: 3 + -1 = +2 (single winner)
    // total: 1 + 1 + 2 = 4
    expect(total).toBe(4);
  });
});

describe('SRD stacking type: untyped sums everything (bonuses + penalties)', () => {
  it('untyped with mixed positive and negative → single summed winner', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: undefined, value: 5, source: 'A' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: undefined, value: -2, source: 'B' }),
      mkChange({ index: 2, field: 'system.attack', bonusType: undefined, value: 1, source: 'C' }),
      mkChange({ index: 3, field: 'system.attack', bonusType: undefined, value: -1, source: 'D' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 3, reason: 'untyped-stack' }); // 5 -2 +1 -1
    // Every input shows applied: true in history (no "rejected" entries for stacking groups)
    expect(history.every(h => h.applied)).toBe(true);
  });

  it('untyped that sums to zero produces no winner', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: undefined, value: 2, source: 'A' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: undefined, value: -2, source: 'B' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(0);
  });

  it('untyped all-negative → summed penalty winner', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: undefined, value: -2, source: 'A' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: undefined, value: -3, source: 'B' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: -5, reason: 'untyped-stack' });
  });

  it('explicit UNTYPED constant and undefined are aliases (same group, summed)', () => {
    // Callers may pass either `undefined` or BONUS_TYPE_UNTYPED; the engine
    // normalizes undefined → UNTYPED at grouping so both land in the same stack.
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: undefined, value: 2, source: 'ImplicitA' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: UNTYPED, value: 3, source: 'ExplicitB' }),
      mkChange({ index: 2, field: 'system.attack', bonusType: undefined, value: -1, source: 'ImplicitC' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 4, bonusType: UNTYPED, reason: 'untyped-stack' });
  });
});

describe('SRD per-field independence under penalties', () => {
  it('penalty on field A does not suppress bonus on field B (same type)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 4, source: 'BonusA' }),
      mkChange({ index: 1, field: 'system.damage', bonusType: MATERIAL, value: -2, source: 'PenaltyB' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(2);
    const attack = winners.find(w => w.source === 'BonusA')!;
    const damage = winners.find(w => w.source === 'PenaltyB')!;
    expect(attack.value).toBe(4);
    expect(damage.value).toBe(-2);
  });

  it('penalty in one type does NOT suppress bonuses of the SAME type on same field (the prior-engine bug)', () => {
    // Regression: the original engine had isPenaltyGroup logic that rejected
    // every non-penalty change in a group containing any penalty. RAW says the
    // best bonus and worst penalty BOTH apply.
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 4, source: 'Bonus' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: -2, source: 'Penalty' }),
    ];

    const { winners, history } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(2);

    const bonusRow = history.find(h => h.source === 'Bonus')!;
    expect(bonusRow.applied).toBe(true);
    expect(bonusRow.rejection).toBeUndefined();
  });
});

describe('SRD edge cases', () => {
  it('single change in a named-type group always applies (no comparison group)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 3, source: 'Only' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 3, source: 'Only', reason: 'highest' });
  });

  it('NaN-valued change is dropped silently (callers should pre-filter)', () => {
    const changes: StackingChange[] = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: Number.NaN, source: 'Junk' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 3, source: 'Real' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ value: 3, source: 'Real' });
  });

  it('many bonuses + many penalties same type (stress): exact best-bonus + worst-penalty', () => {
    const changes: StackingChange[] = [];
    for (let i = 0; i < 50; i++) {
      changes.push(mkChange({ index: i, field: 'system.attack', bonusType: MATERIAL, value: i + 1, source: `B${i}` }));
    }
    for (let i = 0; i < 50; i++) {
      changes.push(mkChange({
        index: 50 + i,
        field: 'system.attack',
        bonusType: MATERIAL,
        value: -(i + 1),
        source: `P${i}`,
      }));
    }

    const { winners } = resolveActiveEffectChanges(changes);
    expect(winners).toHaveLength(2);
    const bonus = winners.find(w => w.reason === 'highest')!;
    const penalty = winners.find(w => w.reason === 'penalty')!;
    expect(bonus.value).toBe(50);
    expect(penalty.value).toBe(-50);
  });

  it('different fields, different types, mixed signs — winners count matches groups (no cross-talk)', () => {
    const changes = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 2, source: 'A' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: -1, source: 'B' }),
      mkChange({ index: 2, field: 'system.damage', bonusType: ENHANCEMENT, value: 1, source: 'C' }),
      mkChange({ index: 3, field: 'system.damage', bonusType: undefined, value: 1, source: 'D' }),
      mkChange({ index: 4, field: 'system.damage', bonusType: undefined, value: -1, source: 'E' }),
    ];

    const { winners } = resolveActiveEffectChanges(changes);
    // attack/material: bonus +2, penalty -1 → 2 winners
    // damage/enhancment: +1 → 1 winner
    // damage/undefined: 1 + -1 = 0 → 0 winners
    expect(winners).toHaveLength(3);
  });
});

describe('Dual-stack interactions with penalties', () => {
  it('excluding a penalty effect: masked stack loses the penalty winner', () => {
    const changes: StackingChange[] = [
      mkChange({ index: 0, field: 'system.attack', bonusType: MATERIAL, value: 4, source: 'Bonus', effectId: 'b-1' }),
      mkChange({ index: 1, field: 'system.attack', bonusType: MATERIAL, value: -3, source: 'HiddenPenalty', effectId: 'hidden-pen' }),
    ];

    const real = resolveActiveEffectChanges(changes);
    const masked = resolveActiveEffectChanges(changes, new Set(['hidden-pen']));

    expect(real.winners.reduce((acc, w) => acc + w.value, 0)).toBe(1); // 4 - 3
    expect(masked.winners.reduce((acc, w) => acc + w.value, 0)).toBe(4); // hidden penalty removed
  });

  it('excluding the highest bonus: masked stack falls back to next-highest', () => {
    const changes: StackingChange[] = [
      mkChange({ index: 0, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 5, source: 'Hidden', effectId: 'h-1' }),
      mkChange({ index: 1, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 3, source: 'Visible', effectId: 'v-1' }),
      mkChange({ index: 2, field: 'system.defense.armorClass', bonusType: MATERIAL, value: 2, source: 'AlsoVisible', effectId: 'v-2' }),
    ];

    const masked = resolveActiveEffectChanges(changes, new Set(['h-1']));
    expect(masked.winners).toHaveLength(1);
    expect(masked.winners[0]).toMatchObject({ value: 3, source: 'Visible' });
  });
});
