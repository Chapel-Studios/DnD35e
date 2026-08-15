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
 * - `confirmCritical()` — re-rolls the same formula and compares the total against a target
 *   AC. Used by attack rolls (Phase poc 10); saves and AC checks never call it.
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

  constructor(
    formula: string,
    data: Record<string, unknown> = {},
    options: Record<string, unknown> & { situationalModifiers?: RollModifier[] } = {}
  ) {
    super(formula, data, options);
    this.situationalModifiers = options.situationalModifiers ?? [];
  }

  /** The roll's first term, if it's a die (expected to be the `1d20`). */
  private get d20() {
    const first = this.terms[0];
    return first instanceof foundry.dice.terms.Die ? first : undefined;
  }

  /** Whether the d20 term's active result is a natural 20. Only meaningful once evaluated. */
  get isCriticalThreat(): boolean {
    const die = this.d20;
    if (!die) return false;
    return die.results.some(r => r.active && r.result === die.faces);
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
   * Re-roll this D20Roll's formula and compare the result against a target AC — used to
   * confirm a critical threat on an attack roll. Not exercised by saves/AC checks.
   */
  async confirmCritical(targetAC: number): Promise<boolean> {
    const confirmRoll = new D20Roll(this.formula, this.data, foundry.utils.deepClone(this.options));
    await confirmRoll.evaluate();
    return (confirmRoll.total ?? 0) >= targetAC;
  }
}

export { D20Roll };
