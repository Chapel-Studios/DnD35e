/**
 * System Settings Module
 *
 * Provides access to settings constants, types, and utilities.
 * Organized by category following the entity folder pattern.
 */

import { registerCombatSettings } from './combat/index.mjs';
import { registerCoreSettings } from './core/index.mjs';
import { registerCurrencySettings } from './currency/index.mjs';
import { registerDisplaySettings } from './display/index.mjs';
import { registerGameRulesSettings } from './gameRules/index.mjs';
import { SYSTEM_ID } from './shared.mjs';

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
export * from './shared/index.mjs';
export * from './skills/index.mjs';

// Helpers
export { getSetting, helpers, setSetting } from './helpers.mjs';

/**
 * Register all system settings.
 * Called during system initialization (Hooks.once('init')).
 *
 * Each category's `registerXxxSettings()` is responsible for registering both
 * its menu button(s) and its individual settings.
 */
function registerSettings(): void {
  console.log(`${SYSTEM_ID} | Registering system settings`);

  registerCoreSettings();
  registerGameRulesSettings();
  registerCombatSettings();
  registerDisplaySettings();
  registerCurrencySettings();

  console.log(`${SYSTEM_ID} | Settings registration complete`);
}

export { registerSettings };
