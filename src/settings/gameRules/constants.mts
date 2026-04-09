import type { DamageReductionTypesConfig } from './_types.mjs';

/**
 * Game Rules settings constants
 */

/**
 * Game Rules setting keys
 */
export const GAME_RULES_KEYS = {
  // DIAGONAL_MOVEMENT: 'diagonalMovement',
  // EXPERIENCE_RATE: 'experienceRate',
  // DISABLE_EXPERIENCE_TRACKING: 'disableExperienceTracking',
  // USE_FRACTIONAL_BASE_BONUSES: 'useFractionalBaseBonuses',
  // ALLOW_BACKGROUND_SKILLS: 'allowBackgroundSkills',
  // PSIONICS_ARE_DIFFERENT: 'psionicsAreDifferent',
  // LOW_LIGHT_VISION_MODE: 'lowLightVisionMode',
  // USE_COMBAT_CHARACTER_SHEET: 'useCombatCharacterSheet',
  // MEASURE_STYLE: 'measureStyle',
  DAMAGE_REDUCTION_TYPES: 'damageReductionTypes',
} as const;

/**
 * Game Rules menu key
 */
export const GAME_RULES_MENU = 'gameRulesConfig';

/**
 * Diagonal movement choices
 */
export const DIAGONAL_MOVEMENT_CHOICES = {
  '555': 'dnd35e.SETTINGS.DiagonalMovement.PHB',
  '5105': 'dnd35e.SETTINGS.DiagonalMovement.DMG',
} as const;

/**
 * Experience rate choices
 */
export const EXPERIENCE_RATE_CHOICES = {
  slow: 'dnd35e.SETTINGS.ExperienceRate.Slow',
  medium: 'dnd35e.SETTINGS.ExperienceRate.Medium',
  fast: 'dnd35e.SETTINGS.ExperienceRate.Fast',
} as const;

/**
 * Default damage reduction types
 */
export const DEFAULT_DAMAGE_REDUCTION_TYPES: DamageReductionTypesConfig = {
  'alchemical_silver': { label: 'Alchemical Silver', enabled: true, isSystem: true },
  'adamantine': { label: 'Adamantine', enabled: true, isSystem: true },
  'cold_iron': { label: 'Cold Iron', enabled: true, isSystem: true },
};
