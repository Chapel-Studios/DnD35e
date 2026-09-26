/**
 * D20Roll — Roll subclass for all d20-based checks (saving throws, ability checks,
 * attack rolls).
 *
 * Wraps a plain `1d20 + ...` formula (already fully resolved through FormulaFamiliar —
 * see phase-07-roll-formulas.md §7.2's "No `@attr` Bridge") with:
 * - `situationalModifiers` — the labeled breakdown list shown on the roll's chat card
 *   (see rollMessages.mts), carried through `options.situationalModifiers` so it survives
 *   `Roll.toJSON()` / `Roll.fromData()` round-trips.
 * - `isCriticalThreat` / `isFumble` — natural 20 / natural 1 detection on the roll's first
 *   term. Only meaningful once the roll has been evaluated.
 * - `rollConfirmation()` — re-rolls the same formula the instant a threat is detected (SRD
 *   critical confirmation, poc.10 Story D). The AC comparison that turns a confirmed threat
 *   into an actual critical hit is Story E's job; saves and AC checks never call this.
 *
 * Registered in `CONFIG.Dice.rolls` (see main.mts) alongside the native `Roll` class so
 * `Roll.fromData()` can reconstruct a serialized D20Roll (e.g. from a stored ChatMessage) by
 * its class name. `Roll` stays first/default so `Roll.create()` and any other code that builds
 * a plain roll elsewhere in Foundry is unaffected.
 *
 * @module
 */
import type { RollModifier } from './types.mjs';

class D20Roll extends Roll {
  /** Labeled modifier breakdown (base save/AC total, situational bonus, etc.) for the chat card. */
  situationalModifiers: RollModifier[];
  /**
   * Formula text for the chat card header. Defaults to `this.formula`, but callers that
   * flavor-tag `formula` (`d20Formula.mts`'s `flavorTerm()`) for tooltip clarity pass a plain,
   * unbracketed version here instead — the bracket syntax is only meant to label dice groups
   * in the tooltip breakdown, not to appear in the card's headline formula text.
   */
  displayFormula: string;

  constructor(
    formula: string,
    data: Record<string, unknown> = {},
    options: Record<string, unknown> & { situationalModifiers?: RollModifier[]; displayFormula?: string } = {}
  ) {
    super(formula, data, options);
    this.situationalModifiers = options.situationalModifiers ?? [];
    this.displayFormula = options.displayFormula ?? this.formula;
  }

  /** The roll's first term, if it's a die (expected to be the `1d20`). */
  private get d20() {
    const first = this.terms[0];
    return first instanceof foundry.dice.terms.Die ? first : undefined;
  }

  /**
   * Whether the d20 term's active result meets or exceeds `threshold` (natural 20 by
   * default). Only meaningful once evaluated. Saves/ability checks have no threat range
   * and always use the default; an attack roll's `executeAction()` (poc.10 §10.4) passes
   * the weapon's live `critRange` instead.
   */
  isCriticalThreat (threshold: number = 20): boolean {
    const die = this.d20;
    if (!die) return false;
    return die.results.some(r => r.active && r.result >= threshold);
  }

  /** Whether the d20 term's active result is a natural 1. Only meaningful once evaluated. */
  get isFumble(): boolean {
    const die = this.d20;
    if (!die) return false;
    return die.results.some(r => r.active && r.result === 1);
  }

  /** The d20 term's active face value (e.g. 14), for chat card display. Only meaningful once evaluated. */
  get naturalResult(): number | undefined {
    return this.d20?.results.find(r => r.active)?.result;
  }

  /**
   * Re-rolls this D20Roll's formula (SRD critical confirmation, poc.10 Story D) — rolled
   * eagerly the moment a threat is detected, not deferred to Story E. Not exercised by
   * saves/AC checks.
   */
  async rollConfirmation(): Promise<D20Roll> {
    const confirmRoll = new D20Roll(this.formula, this.data, foundry.utils.deepClone(this.options));
    await confirmRoll.evaluate();
    return confirmRoll;
  }
}

export { D20Roll };
