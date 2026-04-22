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
 * Default damage reduction types with i18n keys
 * These are seeded into the game rules settings during registration.
 * Labels will be pre-localized in CONFIG.dnd35e.gameRules.damageReductionTypes at i18nInit.
 */
export const DEFAULT_DAMAGE_REDUCTION_TYPES: DamageReductionTypesConfig = {
  'acid': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Acid', enabled: true, isSystem: true },
  'bludgeoning': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Bludgeoning', enabled: true, isSystem: true },
  'cold': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Cold', enabled: true, isSystem: true },
  'electricity': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Electricity', enabled: true, isSystem: true },
  'fire': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Fire', enabled: true, isSystem: true },
  'force': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Force', enabled: true, isSystem: true },
  'negative': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.NegativeEnergy', enabled: true, isSystem: true },
  'piercing': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Piercing', enabled: true, isSystem: true },
  'positive': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.PositiveEnergy', enabled: true, isSystem: true },
  'slashing': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Slashing', enabled: true, isSystem: true },
  'sonic': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Sonic', enabled: true, isSystem: true },
  'adamantine': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Adamantine', enabled: true, isSystem: true },
  'alchemical_silver': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.AlchemicalSilver', enabled: true, isSystem: true },
  'cold_iron': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.ColdIron', enabled: true, isSystem: true },
  'epic': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Epic', enabled: true, isSystem: true },
  'magic': { label: 'dnd35e.DAMAGE_REDUCTION_TYPES.Magic', enabled: true, isSystem: true },
};
