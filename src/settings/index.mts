/**
 * System Settings Module
 *
 * This module provides access to settings constants, types, and utilities.
 * Organized by category following the entity folder pattern.
 */

// Export types
export type * from './_types.mjs';
export type { ConstantTypes } from './constants/index.mjs';

// Shared
export { SYSTEM_ID } from './shared.mjs';

// Category exports
export * from './combat/index.mjs';
export * from './core/index.mjs';
export * from './currency/index.mjs';
export * from './display/index.mjs';
export * from './gameRules/index.mjs';
export * from './health/index.mjs';
export * from './roll/index.mjs';
export * from './skills/index.mjs';

// Legacy exports (backwards compatibility)
export { constants } from './constants/index.mjs';
export { helpers } from './helpers.mjs';

// Re-export for convenience (backwards compatibility)
export {
  DEFAULT_CURRENCY_CONFIG,
  DEFAULT_HEALTH_CONFIG,
  DEFAULT_ROLL_CONFIG,
  DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE_CHOICES,
  PARTY_HUD_CHOICES,
  SETTING_MENUS,
  SETTINGS,
  SHARED_VISION_MODE_CHOICES,
  UNIT_CHOICES,
} from './constants/index.mjs';
export { getSetting, setSetting } from './helpers.mjs';

import { registerCombatSettings } from './combat/index.mjs';
import { registerCoreSettings, registerSettingsMenus } from './core/index.mjs';
import { registerCurrencySettings } from './currency/index.mjs';
import { registerDisplaySettings } from './display/index.mjs';
import { registerGameRulesSettings } from './gameRules/index.mjs';
import { SYSTEM_ID as SYSTEM_ID_INTERNAL } from './shared.mjs';

/**
 * Register all system settings.
 * Called during system initialization (Hooks.once('init')).
 */
function registerSettings(): void {
  console.log(`${SYSTEM_ID_INTERNAL} | Registering system settings`);

  registerCoreSettings();
  registerSettingsMenus();
  registerGameRulesSettings();
  registerCombatSettings();
  registerDisplaySettings();
  registerCurrencySettings();

  console.log(`${SYSTEM_ID_INTERNAL} | Settings registration complete`);
}

export { registerSettings };

