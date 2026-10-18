/**
 * Shared type declarations for the system's custom Roll classes.
 *
 * @module
 */

/** A single labeled contributor to a D20Roll's total (e.g. "Fortitude +4", "Situational +2"). */
interface RollModifier {
  label: string;
  value: number;
  /** Resolved formula text (dice preserved, e.g. `1d6+5`) to display instead of `value`'s signed number — set only when the contributor carries a dice term that can't collapse to a flat preview number. */
  formula?: string;
  /** Localized bonus type tag (e.g. "Enhancement") shown alongside the entry — mirrors `HasActiveEffectsNotification`'s `[bonusTypeLabel]` bracket notation. Omitted for untyped contributors. */
  bonusTypeLabel?: string;
  /** True when this entry lost stacking resolution and was NOT applied to the roll — shown struck-through with `ignoredReason`, same as `HasActiveEffectsNotification`'s `.is-ignored` entries. */
  isIgnored?: boolean;
  /** Localized reason this entry was ignored (e.g. "lower bonus than +4"). Only meaningful when `isIgnored` is true. */
  ignoredReason?: string;
}

export type { RollModifier };
