import { DAMAGE_TYPE_FIRE } from '@constants/attacks/damageTypes.mjs';
import { buildMarkerBag } from '@constants/diceMarkerBag.mjs';
import { DAMAGE_TYPE_MARKER_KEY } from '@constants/typedDamageMarkers.mjs';
import { extractFlatModifier } from '@source/dice/d20Formula.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Regression for PR #102 (second review wave, item #9): a flat `$typed(fire, 3)` component
// resolves to a flavored numeric term (e.g. `3[__dnd35e_marker__type=...__]`), which
// extractFlatModifier() used to hand straight to Roll.safeEval() as "arithmetic" — not valid
// JS, so a weapon with a flat typed component could crash the attack dialog entirely instead
// of just rolling. This stub's safeEval throws on anything non-numeric, mirroring that real
// crash symptom precisely (the shared global Roll stub in tests/setup.mts is too lenient to
// reproduce it, and has no `.dice` getter at all).
class FlatOnlyRollStub {
  dice: unknown[] = [];
  terms: unknown[] = [];
  constructor(public formula: string) {}
  static safeEval = vi.fn((expr: string) => {
    const n = Number(expr);
    if (!Number.isFinite(n)) throw new Error(`Invalid flat expression passed to Roll.safeEval: "${expr}"`);
    return n;
  });
}

describe('extractFlatModifier — flat $typed() marker stripping', () => {
  beforeEach(() => vi.stubGlobal('Roll', FlatOnlyRollStub));
  afterEach(() => vi.unstubAllGlobals());

  it('strips a flat $typed() marker bag before evaluating, instead of crashing on it', () => {
    const marker = buildMarkerBag({ [DAMAGE_TYPE_MARKER_KEY]: DAMAGE_TYPE_FIRE });
    expect(extractFlatModifier(`3[${marker}]`)).toEqual({ flat: 3, hasDice: false });
  });

  it('still evaluates a plain flat term with no marker at all', () => {
    expect(extractFlatModifier('3')).toEqual({ flat: 3, hasDice: false });
  });
});
