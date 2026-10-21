/**
 * Reserved dice-flavor markers for the `$critMultiply(dieFormula)`/`$critExempt(dieFormula)`
 * FormulaFamiliar escape hatches (`FormulaResolver.functionGrammar.mts`).
 *
 * By default, `flavorDamageDiceBySource()` (`d20Formula.mts`) exempts every AE-contributed
 * dice group from critical-hit multiplication (SRD: "extra damage dice over and above a
 * weapon's normal damage are never multiplied") while leaving the weapon's own base dice
 * eligible. These two markers let an author invert that default for a specific dice group:
 * - `$critMultiply(1d6)` inside an AE's own formula/change value — marks that AE's dice as
 *   still eligible for crit multiplication despite being AE-sourced.
 * - `$critExempt(1d6)` inside a weapon's own base `damageFormula` — marks that portion of the
 *   weapon's own dice as exempt despite being the weapon's own base dice.
 *
 * Both functions resolve (at `FormulaData.resolveSource()` time, well before
 * `_computeDamageFormula()`'s flavoring pass ever runs) to the inner dice text with one of
 * these markers embedded as the term's own Foundry bracket-flavor tag (e.g. `1d6[__dnd35e_critMultiply__]`)
 * — plain text, so it survives formula resolution intact. `flavorDamageDiceBySource()` then
 * reads the marker back off each parsed dice group and overrides its default
 * positional-attribution-based exemption decision before replacing it with a real,
 * player-facing display label. These marker strings never reach
 * `DamageRoll#evaluateCritical()`'s exempt-flavor comparison as-is — they're resolved and
 * replaced long before the roll is ever constructed.
 */
const CRIT_MULTIPLY_MARKER = '__dnd35e_critMultiply__';
const CRIT_EXEMPT_MARKER = '__dnd35e_critExempt__';

export { CRIT_EXEMPT_MARKER, CRIT_MULTIPLY_MARKER };
