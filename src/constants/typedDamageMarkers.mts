import type { DamageType } from '@constants/attacks/damageTypes.mjs';
import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import { parseMarkerBag } from '@constants/diceMarkerBag.mjs';

/**
 * Damage-type dimension of the shared dice marker bag (`@constants/diceMarkerBag.mjs`) —
 * backs the `$typed(damageType, formula)` FormulaFamiliar function
 * (`FormulaResolver.functionGrammar.mts`).
 *
 * `$typed()` resolves its inner dice formula normally, then upserts this dimension into every
 * top-level dice group's flavor via `mergeDiceGroupMarker()` — preserving any other dimension
 * (e.g. a nested `$critMultiply()`'s crit override) already present on the same group, instead
 * of discarding it. `readDamageType()` reads it back out.
 *
 * **Wired into the display breakdown, not the real roll's own flavor**:
 * `attributeDamageDiceGroups()`/`groupDamageDiceBySource()` (`src/dice/d20Formula.mts`) read
 * this back into each breakdown row's `damageTypeLabel`. `flavorDamageDiceBySource()` (the
 * function that builds the *actual* roll formula) deliberately leaves its own `[flavor]` tag
 * dedicated to source attribution only — damage type rides alongside as a second, separate
 * field on the breakdown row rather than being folded into that single flavor slot. See
 * `flavorDamageDiceBySource()`'s doc comment for why.
 */
const DAMAGE_TYPE_MARKER_KEY = 'type';

/** Reads this dice group's damage type (if any) back off its raw flavor string. */
function readDamageType(flavor: string | undefined): DamageType | null {
  const value = parseMarkerBag(flavor)?.[DAMAGE_TYPE_MARKER_KEY];
  return value && (DAMAGE_TYPES as readonly string[]).includes(value) ? value as DamageType : null;
}

export { DAMAGE_TYPE_MARKER_KEY, readDamageType };
