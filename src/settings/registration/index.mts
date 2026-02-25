/**
 * System Settings Registration
 *
 * This module handles all system settings registration with Foundry VTT.
 */

import { SYSTEM_ID } from '../constants/index.mjs';
import { registerCombatSettings } from './combat.mjs';
import { registerConfigSettings } from './config.mjs';
import { registerCoreSettings } from './core.mjs';
import { registerDisplaySettings } from './display.mjs';
import { registerGameRulesSettings } from './gameRules.mjs';
import { registerSettingsMenus } from './menus.mjs';

/**
 * Register all system settings.
 * Called during system initialization (Hooks.once('init')).
 */
function registerSettings(): void {
  console.log(`${SYSTEM_ID} | Registering system settings`);

  registerCoreSettings();
  registerSettingsMenus();
  registerGameRulesSettings();
  registerCombatSettings();
  registerDisplaySettings();
  registerConfigSettings();

  console.log(`${SYSTEM_ID} | Settings registration complete`);
}

const registration = {
  registerSettings,
  registerCoreSettings,
  registerSettingsMenus,
  registerGameRulesSettings,
  registerCombatSettings,
  registerDisplaySettings,
  registerConfigSettings,
} as const;

export {
  registerCombatSettings,
  registerConfigSettings,
  registerCoreSettings,
  registerDisplaySettings,
  registerGameRulesSettings,
  registerSettings,
  registerSettingsMenus,
  registration,
};
