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
 * message/history round trip. Instead, `evaluateCritical()` walks `this.terms` explicitly,
 * called only once by the caller that actually resolves a confirmed critical hit.
 *
 * Registered in `CONFIG.Dice.rolls` (see main.mts) alongside `Roll`/`D20Roll` so
 * `Roll.fromData()` can reconstruct a serialized DamageRoll by its class name.
 *
 * @module
 */
class DamageRoll extends Roll {
  /**
   * Multiplies top-level dice + flat numeric terms in place before evaluation — SRD's "roll all
   * damage, then ×multiplier" simplified to a single multiplied roll. `exemptDiceIndices`, when
   * given, skips multiplying the `DiceTerm`s at those 0-based positions (the Nth `DiceTerm`
   * encountered, left to right, counting only dice — flat numeric terms are unaffected) — SRD's
   * critical-hit exception: "extra damage dice over and above a weapon's normal damage are
   * never multiplied" (e.g. a Flaming weapon's bonus 1d6 fire). The formula builder
   * (`flavorDamageDiceBySource()`) decides, per dice group, which position goes into
   * `exemptDiceIndices` — normally every AE-contributed group, but an author can invert that
   * default for a specific group via the `$critMultiply`/`$critExempt` FormulaFamiliar escape
   * hatches (see `@constants/critDiceMarkers.mjs`). Position-based rather than `[flavor]`-label
   * matching: two dice groups can share the same display label (e.g. two groups from the same
   * AE) yet need opposite crit treatment, so a label alone isn't granular enough. Deliberately
   * explicit rather than `Roll#alter()`'s native parenthetical-skipping — the latter would also
   * (incorrectly) exempt any unrelated non-dice parenthetical term that happens to appear in the
   * formula for other reasons. Omit `exemptDiceIndices` to multiply every top-level dice/numeric
   * term unconditionally (no exception — e.g. a non-weapon damage roll with no per-source split).
   */
  async evaluateCritical(critMultiplier: number, exemptDiceIndices?: Iterable<number>): Promise<this> {
    if (critMultiplier !== 1) {
      const exempt = exemptDiceIndices ? new Set(exemptDiceIndices) : null;
      let diceIndex = 0;
      this.terms = this.terms.map(term => {
        if (term instanceof foundry.dice.terms.DiceTerm) {
          const index = diceIndex++;
          return exempt?.has(index) ? term : term.alter(critMultiplier, 0);
        }
        if (term instanceof foundry.dice.terms.NumericTerm) term.number *= critMultiplier;
        return term;
      });
      // `resetFormula()` isn't in the fvtt-types Roll declaration (used internally by `Roll#alter()`)
      // but is a real public Roll method that recomputes `this._formula` from the altered `this.terms`.
      (this as unknown as { resetFormula(): void }).resetFormula();
    }
    return this.evaluate();
  }
}

export { DamageRoll };
