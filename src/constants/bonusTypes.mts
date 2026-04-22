/**
 * Bonus type constants for AE stacking resolution.
 *
 * Each bonus type participates in stacking rules:
 * - 'untyped' + 'dodge': always stack (sum all values)
 * - Named types: highest-wins per field per type
 * - Penalties: always apply
 *
 * PRINCIPLE: Add new types only when a consumer exists.
 * Do NOT add speculative types. When a phase introduces a new AE type
 * or mechanical system that needs a new bonus type, add it then.
 *
 * Phase mapping (types added by phase that uses them):
 * - Phase 2: 'material' | 'broken' | 'masterwork' (Material AE system)
 * - Phase 10 (Feats): 'dodge' | 'untyped' (will add when feat system lands)
 * - Phase 15+ (Equipment AC): 'armor' | 'shield' | 'natural' | 'deflection' | 'enhancement'
 */

/**
 * Individual bonus type constants with localization keys.
 * Use these in schema field choices and initial values.
 * Localization happens via Foundry's LOCALIZATION_PREFIXES system.
 */
const BONUS_TYPE_MATERIAL = 'dnd35e.BONUS_TYPES.Material' as const;
const BONUS_TYPE_BROKEN = 'dnd35e.BONUS_TYPES.Broken' as const;
const BONUS_TYPE_MASTERWORK = 'dnd35e.BONUS_TYPES.Masterwork' as const;

/**
 * Array of all bonus types for form choices and validation.
 * Built from individual constants to ensure consistency.
 */
const BONUS_TYPES = [BONUS_TYPE_MATERIAL, BONUS_TYPE_BROKEN, BONUS_TYPE_MASTERWORK] as const;

/**
 * Union of all valid bonus types in the system.
 * Derived from BONUS_TYPES array for type safety.
 * Extended by each phase as new AE types are introduced.
 * Used for TypeScript type-checking and runtime validation.
 */
type BonusType = (typeof BONUS_TYPES)[number];

export {
  BONUS_TYPE_BROKEN,
  BONUS_TYPE_MASTERWORK,
  BONUS_TYPE_MATERIAL,
  BONUS_TYPES,
  type BonusType,
};
