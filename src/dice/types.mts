/**
 * Shared type declarations for the system's custom Roll classes.
 *
 * @module
 */

/** A single labeled contributor to a D20Roll's total (e.g. "Fortitude +4", "Situational +2"). */
interface RollModifier {
  label: string;
  value: number;
}

export type { RollModifier };
