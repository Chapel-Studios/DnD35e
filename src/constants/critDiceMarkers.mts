import { parseMarkerBag } from '@constants/diceMarkerBag.mjs';

/**
 * Crit-override dimension of the shared dice marker bag (`@constants/diceMarkerBag.mjs`) —
 * backs the `$critMultiply(dieFormula)`/`$critExempt(dieFormula)` FormulaFamiliar escape
 * hatches (`FormulaResolver.functionGrammar.mts`).
 *
 * By default, `flavorDamageDiceBySource()` (`d20Formula.mts`) exempts every AE-contributed
 * dice group from critical-hit multiplication (SRD: "extra damage dice over and above a
 * weapon's normal damage are never multiplied") while leaving the weapon's own base dice
 * eligible. These two functions let an author invert that default for a specific dice group:
 * - `$critMultiply(1d6)` inside an AE's own formula/change value — marks that AE's dice as
 *   still eligible for crit multiplication despite being AE-sourced.
 * - `$critExempt(1d6)` inside a weapon's own base `damageFormula` — marks that portion of the
 *   weapon's own dice as exempt despite being the weapon's own base dice.
 *
 * Both functions resolve (at `FormulaData.resolveSource()` time, well before
 * `_computeDamageFormula()`'s flavoring pass ever runs) to the inner dice text with this
 * dimension upserted into the term's own Foundry bracket-flavor tag via
 * `mergeDiceGroupMarker()` — preserving any other dimension (e.g. a nested `$typed()`'s
 * damage type) already present on the same group. `attributeDamageDiceGroups()` then reads
 * `readCritOverride()` back off each parsed dice group and overrides its default
 * positional-attribution-based exemption decision before `flavorDamageDiceBySource()`
 * replaces the whole flavor with a real, player-facing display label. These marker strings
 * never reach `DamageRoll#evaluateCritical()`'s exempt-flavor comparison as-is — they're
 * resolved and replaced long before the roll is ever constructed.
 */
const CRIT_MARKER_KEY = 'crit';
const CRIT_OVERRIDE_MULTIPLY = 'multiply';
const CRIT_OVERRIDE_EXEMPT = 'exempt';

type CritOverride = typeof CRIT_OVERRIDE_MULTIPLY | typeof CRIT_OVERRIDE_EXEMPT;

/** Reads this dice group's crit override (if any) back off its raw flavor string. */
function readCritOverride(flavor: string | undefined): CritOverride | null {
  const value = parseMarkerBag(flavor)?.[CRIT_MARKER_KEY];
  return value === CRIT_OVERRIDE_MULTIPLY || value === CRIT_OVERRIDE_EXEMPT ? value : null;
}

export { CRIT_MARKER_KEY, CRIT_OVERRIDE_EXEMPT, CRIT_OVERRIDE_MULTIPLY, readCritOverride };
export type { CritOverride };
