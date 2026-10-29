/**
 * Shared type declarations for the system's custom Roll classes.
 *
 * @module
 */

/** A labeled roll contribution, optionally carrying display-only preparation history. */
interface RollModifier {
  /** Stable source identity; localized labels are never identifiers. */
  id?: string;
  label: string;
  value: number;
  /** Resolved dice-preserving formula. When present it replaces `value` for rolling; never add both. */
  formula?: string;
  /** Localized bonus type tag (e.g. "Enhancement") shown alongside the entry — mirrors `HasActiveEffectsNotification`'s `[bonusTypeLabel]` bracket notation. Omitted for untyped contributors. */
  bonusTypeLabel?: string;
  /** True when this entry lost stacking resolution and was NOT applied to the roll — shown struck-through with `ignoredReason`, same as `HasActiveEffectsNotification`'s `.is-ignored` entries. */
  isIgnored?: boolean;
  /** Localized reason this entry was ignored (e.g. "lower bonus than +4"). Only meaningful when `isIgnored` is true. */
  ignoredReason?: string;
  /** Display-only history for an already-prepared value. Never included in arithmetic. */
  breakdown?: RollModifier[];
}

interface WeaponDamageRollModifier extends RollModifier {
  /** Positions within this entry's top-level dice which do not multiply on a critical. An explicit [] keeps all top-level dice eligible; absent metadata preserves the parenthesized situational-formula behavior. */
  exemptDiceIndices?: number[];
}

export type { RollModifier, WeaponDamageRollModifier };
