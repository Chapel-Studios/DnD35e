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
 * **Not yet wired into a reader**: `flavorDamageDiceBySource()`/`groupDamageDiceBySource()`
 * (`src/dice/d20Formula.mts`) don't read this marker back yet — that's a separate poc.10
 * Story J checklist item. Until that lands, a `$typed()` dice group's marker survives
 * resolution but is overwritten by `flavorDamageDiceBySource()`'s source-only labeling the
 * same way any other dice group's flavor is.
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
