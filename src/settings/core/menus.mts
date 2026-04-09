/**
 * Settings menus registration
 */

import { SETTING_MENUS } from '../constants/index.mjs';
import { CurrencySettingsConfig } from '../currency/index.mjs';
import { DisplaySettingsConfig } from '../display/index.mjs';
import { GameRulesSettingsConfig } from '../gameRules/index.mjs';
import { SYSTEM_ID } from '../shared.mjs';

/**
 * Register settings menu buttons
 */
function registerSettingsMenus(): void {
  // Game Rules Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.GAME_RULES, {
    name: 'dnd35e.SETTINGS.GameRules.Name',
    label: 'dnd35e.SETTINGS.GameRules.Label',
    hint: 'dnd35e.SETTINGS.GameRules.Hint',
    icon: 'fas fa-list-check',
    type: GameRulesSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // // Combat Menu
  // game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.COMBAT, {
  //   name: 'dnd35e.SETTINGS.Combat.Name',
  //   label: 'dnd35e.SETTINGS.Combat.Label',
  //   hint: 'dnd35e.SETTINGS.Combat.Hint',
  //   icon: 'fas fa-swords',
  //   type: CombatSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
  //   restricted: true,
  // });

  // Display Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.DISPLAY, {
    name: 'dnd35e.SETTINGS.Display.Name',
    label: 'dnd35e.SETTINGS.Display.Label',
    hint: 'dnd35e.SETTINGS.Display.Hint',
    icon: 'fas fa-display',
    type: DisplaySettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: false, // Client-side settings, available to all users
  });

  // // Health Configuration Menu
  // game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.HEALTH, {
  //   name: 'dnd35e.SETTINGS.Health.Name',
  //   label: 'dnd35e.SETTINGS.Health.Label',
  //   hint: 'dnd35e.SETTINGS.Health.Hint',
  //   icon: 'fas fa-heart-pulse',
  //   type: HealthSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
  //   restricted: true,
  // });

  // // Roll Configuration Menu
  // game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.ROLL, {
  //   name: 'dnd35e.SETTINGS.RollConfig.Name',
  //   label: 'dnd35e.SETTINGS.RollConfig.Label',
  //   hint: 'dnd35e.SETTINGS.RollConfig.Hint',
  //   icon: 'fas fa-dice-d20',
  //   type: RollSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
  //   restricted: true,
  // });

  // Currency Configuration Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.CURRENCY, {
    name: 'dnd35e.SETTINGS.Currency.Name',
    label: 'dnd35e.SETTINGS.Currency.Label',
    hint: 'dnd35e.SETTINGS.Currency.Hint',
    icon: 'fas fa-coins',
    type: CurrencySettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Skill Settings Menu
  // game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.SKILLS, {
  //   name: 'dnd35e.SETTINGS.SkillSettings.Name',
  //   label: 'dnd35e.SETTINGS.SkillSettings.Label',
  //   hint: 'dnd35e.SETTINGS.SkillSettings.Hint',
  //   icon: 'fas fa-book-open',
  //   type: SkillSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
  //   restricted: true,
  // });
}

export { registerSettingsMenus };
