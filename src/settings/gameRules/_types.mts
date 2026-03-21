/**
 * Type definitions for game rules settings
 */

/**
 * Diagonal movement calculation rules
 */
export type DiagonalMovementRule = '555' | '5105';

/**
 * Experience progression rate
 */
export type ExperienceRate = 'slow' | 'medium' | 'fast';

/**
 * A single damage reduction type entry.
 * `isDefault` entries can be disabled but not deleted.
 */
export interface DamageReductionTypeEntry {
  label: string;
  enabled: boolean;
  isDefault: boolean;
}

/**
 * Stored setting value: map of lowercase key → entry.
 */
export type DamageReductionTypesConfig = Record<string, DamageReductionTypeEntry>;
