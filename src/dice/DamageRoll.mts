/**
 * DamageRoll — Roll subclass for weapon damage rolls (poc.10 Story D, pushed back from
 * Phase 7). Sibling of `D20Roll`: same minimal-wrapper contract — the formula arrives
 * already fully resolved through FormulaFamiliar (no `data` substitution, no
 * `getRollData()`/`@attr` bridge).
 *
 * Critical-hit multiplication is NOT applied in the constructor — `Roll.fromData()`
 * reconstructs a serialized roll by calling `new this(data.formula, data.data, data.options)`
 * (see roll.mjs's `fromData()`), and `data.formula`/`data.options` are the roll's OWN already-
 * altered formula/options; re-applying the multiplier there would double it on every chat-
 * message/history round trip. Instead, `evaluateCritical()` applies `Roll#alter()` explicitly,
 * called only once by the caller that actually resolves a confirmed critical hit — pure
 * dice/numeric-term math (multiplies each dice term's quantity and, with `multiplyNumeric:
 * true`, each flat numeric term), matching the SRD critical-multiplier rule (roll the damage
 * dice N times, add static bonuses N times). Unrelated to the `@attr`/`getRollData()`
 * roll-data bridge this codebase deliberately doesn't have.
 *
 * Registered in `CONFIG.Dice.rolls` (see main.mts) alongside `Roll`/`D20Roll` so
 * `Roll.fromData()` can reconstruct a serialized DamageRoll by its class name.
 *
 * @module
 */
class DamageRoll extends Roll {
  /** Multiplies dice + flat numeric terms in place before evaluation — SRD's "roll all damage, then ×multiplier" simplified to a single multiplied roll. */
  async evaluateCritical(critMultiplier: number): Promise<this> {
    if (critMultiplier !== 1) this.alter(critMultiplier, 0, { multiplyNumeric: true });
    return this.evaluate();
  }
}

export { DamageRoll };
