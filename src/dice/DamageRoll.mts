/**
 * DamageRoll — Roll subclass for weapon damage rolls (poc.10 Story D, pushed back from
 * Phase 7). Sibling of `D20Roll`: same minimal-wrapper contract — the formula arrives
 * already fully resolved through FormulaFamiliar (no `data` substitution, no
 * `getRollData()`/`@attr` bridge).
 *
 * Its only added behavior is critical-hit multiplication, applied once at construction via
 * Foundry's built-in `Roll#alter()` — pure dice/numeric-term math (multiplies each dice
 * term's quantity and, with `multiplyNumeric: true`, each flat numeric term), matching the
 * SRD critical-multiplier rule (roll the damage dice N times, add static bonuses N times).
 * Unrelated to the `@attr`/`getRollData()` roll-data bridge this codebase deliberately
 * doesn't have.
 *
 * Registered in `CONFIG.Dice.rolls` (see main.mts) alongside `Roll`/`D20Roll` so
 * `Roll.fromData()` can reconstruct a serialized DamageRoll by its class name.
 *
 * @module
 */
class DamageRoll extends Roll {
  constructor(
    formula: string,
    data: Record<string, unknown> = {},
    options: Record<string, unknown> & { critMultiplier?: number } = {}
  ) {
    super(formula, data, options);
    const critMultiplier = (options.critMultiplier as number | undefined) ?? 1;
    if (critMultiplier !== 1) {
      this.alter(critMultiplier, 0, { multiplyNumeric: true });
    }
  }
}

export { DamageRoll };
