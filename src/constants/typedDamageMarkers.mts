import type { DamageType } from '@constants/attacks/damageTypes.mjs';
import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';
import { parseMarkerBag } from '@constants/diceMarkerBag.mjs';

/**
 * Damage-type dimension of the shared dice marker bag (`@constants/diceMarkerBag.mjs`) —
 * backs the `$typed(damageType, formula)` FormulaFamiliar function
 * (`FormulaResolver.functionGrammar.mts`).
 *
 * `$typed()` resolves its inner dice formula normally, then upserts this dimension into every
 * top-level dice group's flavor via `combineDiceGroupMarker()` (`d20Formula.mts`) —
 * appending into a comma-joined list rather than overwriting, so a weapon's damage can
 * genuinely qualify as more than one type at once (e.g. `1d6[fire] * 2[cold]` deals both Fire
 * AND Cold simultaneously — not "whichever resolved outermost wins"). `readDamageType()`
 * reads the full list back out.
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

/**
 * Reads this dice group's damage type(s) (if any) back off its raw flavor string — always a
 * list, since a component can carry more than one (see module doc); empty when untyped.
 */
function readDamageType(flavor: string | undefined): DamageType[] {
  const value = parseMarkerBag(flavor)?.[DAMAGE_TYPE_MARKER_KEY];
  if (!value) return [];
  return value.split(',').filter((entry): entry is DamageType => (DAMAGE_TYPES as readonly string[]).includes(entry));
}

export { DAMAGE_TYPE_MARKER_KEY, readDamageType };
