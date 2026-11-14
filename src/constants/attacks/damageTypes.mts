import type { SelectOption } from '@vc/fields/index.mjs';

// Individual damage type constants
const DAMAGE_TYPE_PIERCING = 'dnd35e.DAMAGE_TYPES.Piercing' as const;
const DAMAGE_TYPE_BLUDGEONING = 'dnd35e.DAMAGE_TYPES.Bludgeoning' as const;
const DAMAGE_TYPE_SLASHING = 'dnd35e.DAMAGE_TYPES.Slashing' as const;
const DAMAGE_TYPE_FIRE = 'dnd35e.DAMAGE_TYPES.Fire' as const;
const DAMAGE_TYPE_COLD = 'dnd35e.DAMAGE_TYPES.Cold' as const;
const DAMAGE_TYPE_ELECTRICITY = 'dnd35e.DAMAGE_TYPES.Electricity' as const;
const DAMAGE_TYPE_ACID = 'dnd35e.DAMAGE_TYPES.Acid' as const;
const DAMAGE_TYPE_SONIC = 'dnd35e.DAMAGE_TYPES.Sonic' as const;
const DAMAGE_TYPE_FORCE = 'dnd35e.DAMAGE_TYPES.Force' as const;
const DAMAGE_TYPE_POSITIVE = 'dnd35e.DAMAGE_TYPES.Positive' as const;
const DAMAGE_TYPE_NEGATIVE = 'dnd35e.DAMAGE_TYPES.Negative' as const;
const DAMAGE_TYPE_NONE = 'dnd35e.DAMAGE_TYPES.None' as const;

// Array of all damage types for form choices
const DAMAGE_TYPES = [
  DAMAGE_TYPE_PIERCING,
  DAMAGE_TYPE_BLUDGEONING,
  DAMAGE_TYPE_SLASHING,
  DAMAGE_TYPE_FIRE,
  DAMAGE_TYPE_COLD,
  DAMAGE_TYPE_ELECTRICITY,
  DAMAGE_TYPE_ACID,
  DAMAGE_TYPE_SONIC,
  DAMAGE_TYPE_FORCE,
  DAMAGE_TYPE_POSITIVE,
  DAMAGE_TYPE_NEGATIVE,
  DAMAGE_TYPE_NONE,
] as const;
type DamageType = (typeof DAMAGE_TYPES)[number];

const GetDamageTypeSelectOptions = (): SelectOption<DamageType>[] => DAMAGE_TYPES.map((type) => ({
  value: type,
  label: game.i18n.localize(type),
}));

/**
 * Lowercase alias (e.g. `fire`) → canonical `DamageType` constant — derived from
 * `DAMAGE_TYPES`'s own localization-key suffix, not a hand-duplicated second table.
 * Backs the `$typed(damageType, formula)` formula function's first argument
 * (`FormulaResolver.functionGrammar.mts`). A `Map`, not a plain object — a plain object's
 * lookup can return an inherited `Object.prototype` member (e.g. `alias === 'constructor'`)
 * instead of `undefined` for a genuinely unknown alias, which `resolveDamageTypeAlias()`'s
 * callers rely on as the signal to fall back gracefully.
 */
const DAMAGE_TYPE_ALIASES = new Map<string, DamageType>(
  DAMAGE_TYPES.map((type) => [type.slice(type.lastIndexOf('.') + 1).toLowerCase(), type])
);

/**
 * Resolves a damage-type reference to its canonical `DamageType` constant, or `undefined` if
 * unknown. Accepts either a lowercase alias (e.g. `fire`) or the canonical value itself (e.g.
 * `dnd35e.DAMAGE_TYPES.Fire`) — the latter matters because a dynamic `$typed()` first argument
 * (e.g. `$typed(#thisAttack.damageType, 1d6)`) resolves to the canonical constant, not an
 * alias; without this, that case would silently resolve as untyped.
 */
const resolveDamageTypeAlias = (alias: string): DamageType | undefined => {
  const trimmed = alias.trim();
  if ((DAMAGE_TYPES as readonly string[]).includes(trimmed)) return trimmed as DamageType;
  return DAMAGE_TYPE_ALIASES.get(trimmed.toLowerCase());
};

export type { DamageType };
export {
  DAMAGE_TYPE_ACID,
  DAMAGE_TYPE_BLUDGEONING,
  DAMAGE_TYPE_COLD,
  DAMAGE_TYPE_ELECTRICITY,
  DAMAGE_TYPE_FIRE,
  DAMAGE_TYPE_FORCE,
  DAMAGE_TYPE_NEGATIVE,
  DAMAGE_TYPE_NONE,
  DAMAGE_TYPE_PIERCING,
  DAMAGE_TYPE_POSITIVE,
  DAMAGE_TYPE_SLASHING,
  DAMAGE_TYPE_SONIC,
  DAMAGE_TYPES,
  GetDamageTypeSelectOptions,
  resolveDamageTypeAlias,
};
