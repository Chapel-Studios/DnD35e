import type { DamageType } from '@constants/attacks/damageTypes.mjs';
import { DAMAGE_TYPES } from '@constants/attacks/damageTypes.mjs';

/**
 * Reserved dice-flavor marker encoding for the `$typed(damageType, formula)` FormulaFamiliar
 * function (`FormulaResolver.functionGrammar.mts`) — same "stash as plain bracket-flavor text,
 * read back later" trick `critDiceMarkers.mts`'s `CRIT_MULTIPLY_MARKER`/`CRIT_EXEMPT_MARKER`
 * already use, but parameterized by damage type instead of a single reserved constant (there
 * are 12 damage types, not one escape hatch).
 *
 * `$typed()` resolves its inner dice formula normally, then flavors every top-level dice group
 * with `buildTypedDamageMarker(damageType)` instead of discarding the type — plain text, so it
 * survives formula resolution intact into the constructed `Roll`. `parseTypedDamageMarker()`
 * reverses this.
 *
 * **Wired into the display breakdown, not the real roll's own flavor**:
 * `attributeDamageDiceGroups()`/`groupDamageDiceBySource()` (`src/dice/d20Formula.mts`) read
 * this marker back into each breakdown row's `damageTypeLabel`. `flavorDamageDiceBySource()`
 * (the function that builds the *actual* roll formula) deliberately leaves its own `[flavor]`
 * tag dedicated to source attribution only — damage type rides alongside as a second,
 * separate field on the breakdown row rather than being folded into that single flavor slot.
 * See `flavorDamageDiceBySource()`'s doc comment for why.
 */
const TYPED_DAMAGE_MARKER_PREFIX = '__dnd35e_typed__';

/** Builds the reserved dice-flavor marker for `damageType` — see module doc. */
function buildTypedDamageMarker(damageType: DamageType): string {
  return `${TYPED_DAMAGE_MARKER_PREFIX}${damageType}__`;
}

/** Reverses `buildTypedDamageMarker()` — returns `null` if `flavor` isn't a typed-damage marker. */
function parseTypedDamageMarker(flavor: string): DamageType | null {
  if (!flavor.startsWith(TYPED_DAMAGE_MARKER_PREFIX) || !flavor.endsWith('__')) return null;
  const inner = flavor.slice(TYPED_DAMAGE_MARKER_PREFIX.length, -2);
  return (DAMAGE_TYPES as readonly string[]).includes(inner) ? inner as DamageType : null;
}

export { buildTypedDamageMarker, parseTypedDamageMarker, TYPED_DAMAGE_MARKER_PREFIX };
