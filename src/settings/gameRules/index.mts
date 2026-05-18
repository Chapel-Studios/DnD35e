/**
 * Game Rules settings module
 */

export {
  DEFAULT_DAMAGE_REDUCTION_TYPES,
  DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE_CHOICES,
  GAME_RULES_KEYS,
  GAME_RULES_MENU,
} from './constants.mjs';
export { registerGameRulesSettings } from './registration.mjs';
export { GameRulesSettingsConfig } from './sheet/index.mjs';
export type { DamageReductionTypeEntry, DamageReductionTypesConfig, DiagonalMovementRule, ExperienceRate } from './types.mjs';
