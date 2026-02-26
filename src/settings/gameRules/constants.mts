/**
 * Game Rules settings constants
 */

/**
 * Game Rules setting keys
 */
export const GAME_RULES_KEYS = {
  DIAGONAL_MOVEMENT: 'diagonalMovement',
  EXPERIENCE_RATE: 'experienceRate',
  DISABLE_EXPERIENCE_TRACKING: 'disableExperienceTracking',
  USE_FRACTIONAL_BASE_BONUSES: 'useFractionalBaseBonuses',
  ALLOW_BACKGROUND_SKILLS: 'allowBackgroundSkills',
  PSIONICS_ARE_DIFFERENT: 'psionicsAreDifferent',
  LOW_LIGHT_VISION_MODE: 'lowLightVisionMode',
  USE_COMBAT_CHARACTER_SHEET: 'useCombatCharacterSheet',
  MEASURE_STYLE: 'measureStyle',
} as const;

/**
 * Game Rules menu key
 */
export const GAME_RULES_MENU = 'gameRulesConfig';

/**
 * Diagonal movement choices
 */
export const DIAGONAL_MOVEMENT_CHOICES = {
  '555': 'DND35E.Settings.DiagonalMovement.PHB',
  '5105': 'DND35E.Settings.DiagonalMovement.DMG',
} as const;

/**
 * Experience rate choices
 */
export const EXPERIENCE_RATE_CHOICES = {
  slow: 'DND35E.Settings.ExperienceRate.Slow',
  medium: 'DND35E.Settings.ExperienceRate.Medium',
  fast: 'DND35E.Settings.ExperienceRate.Fast',
} as const;
