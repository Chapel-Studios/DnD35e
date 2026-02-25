/**
 * System Settings Module
 *
 * This module provides access to settings constants, types, and utilities.
 */

// Export types
export type * from './_types.mjs';
export type { ConstantTypes } from './constants/index.mjs';

// Export bundled objects
export { constants } from './constants/index.mjs';
export { helpers } from './helpers.mjs';
export { registration } from './registration/index.mjs';

// Re-export for convenience (backwards compatibility)
export {
  DEFAULT_CURRENCY_CONFIG,
  DEFAULT_HEALTH_CONFIG,
  DEFAULT_ROLL_CONFIG,
  DEFAULT_WORLD_DEFAULTS,
  DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE_CHOICES,
  PARTY_HUD_CHOICES,
  SETTING_MENUS,
  SETTINGS,
  SYSTEM_ID,
  UNIT_CHOICES,
} from './constants/index.mjs';
export { getSetting, setSetting } from './helpers.mjs';
export { registerSettings } from './registration/index.mjs';
