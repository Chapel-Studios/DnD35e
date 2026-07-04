/**
 * Combat settings module
 */

export { COMBAT_KEYS, COMBAT_MENU } from './constants.mjs';
export type {
  ActorDeathThresholdOverride,
  DeathThresholdSetting,
} from './deathThreshold.mjs';
export {
  DEATH_THRESHOLD_OVERRIDE_FORMULA_FLAG,
  getActorDeathThreshold,
  getActorDeathThresholdOverride,
  getActorDeathThresholdSetting,
  getWorldDeathThresholdSetting,
  normalizeDeathThresholdSetting,
  PARTY_MEMBER_DEATH_THRESHOLD_DEFAULT,
  resolveDeathThresholdValue,
  STANDARD_ACTOR_DEATH_THRESHOLD_DEFAULT,
  USE_DEATH_THRESHOLD_OVERRIDE_FLAG,
} from './deathThreshold.mjs';
export { registerCombatSettings } from './registration.mjs';
export { CombatSettingsConfig } from './sheet/index.mjs';
