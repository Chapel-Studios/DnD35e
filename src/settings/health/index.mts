/**
 * Health settings module
 */

export {
  DEFAULT_HEALTH_CONFIG,
  HEALTH_KEY,
  HEALTH_MENU,
} from './constants.mjs';
export { registerHealthSettings } from './registration.mjs';
export { HealthSettingsConfig } from './sheet/index.mjs';
export type { HealthConfig, HitDieConfig } from './types.mjs';
