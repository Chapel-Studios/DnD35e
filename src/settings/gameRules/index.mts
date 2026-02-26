/**
 * Game Rules settings module
 */

export type { DiagonalMovementRule, ExperienceRate } from './_types.mjs';
export {
  DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE_CHOICES,
  GAME_RULES_KEYS,
  GAME_RULES_MENU,
} from './constants.mjs';
export { registerGameRulesSettings } from './registration.mjs';
export { GameRulesSettingsConfig } from './sheet/index.mjs';
