/**
 * Settings menus registration
 */

import { VueDisplaySettingsConfig } from '@settings/UI/VueDisplaySettingsConfig.mjs';
import { VueHealthSettingsConfig } from '@settings/UI/VueHealthSettingsConfig.mjs';

import {
  VueCombatSettingsConfig,
  VueGameRulesSettingsConfig,
} from '../../vue/apps/index.mjs';
import { SETTING_MENUS, SYSTEM_ID } from '../constants/index.mjs';

/**
 * Register settings menu buttons
 */
function registerSettingsMenus(): void {
  // Game Rules Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.GAME_RULES, {
    name: 'DND35E.Settings.GameRules.Name',
    label: 'DND35E.Settings.GameRules.Label',
    hint: 'DND35E.Settings.GameRules.Hint',
    icon: 'fas fa-list-check',
    type: VueGameRulesSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Combat Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.COMBAT, {
    name: 'DND35E.Settings.Combat.Name',
    label: 'DND35E.Settings.Combat.Label',
    hint: 'DND35E.Settings.Combat.Hint',
    icon: 'fas fa-swords',
    type: VueCombatSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Display Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.DISPLAY, {
    name: 'DND35E.Settings.Display.Name',
    label: 'DND35E.Settings.Display.Label',
    hint: 'DND35E.Settings.Display.Hint',
    icon: 'fas fa-display',
    type: VueDisplaySettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: false, // Client-side settings, available to all users
  });

  // Health Configuration Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.HEALTH, {
    name: 'DND35E.Settings.Health.Name',
    label: 'DND35E.Settings.Health.Label',
    hint: 'DND35E.Settings.Health.Hint',
    icon: 'fas fa-heart-pulse',
    type: VueHealthSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });
}

export {
  registerSettingsMenus,
};
