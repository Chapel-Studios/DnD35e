/**
 * Settings menus registration
 */

import { CombatSettingsConfig } from '../combat/index.mjs';
import { SETTING_MENUS } from '../constants/index.mjs';
import { CurrencySettingsConfig } from '../currency/index.mjs';
import { DisplaySettingsConfig } from '../display/index.mjs';
import { GameRulesSettingsConfig } from '../gameRules/index.mjs';
import { HealthSettingsConfig } from '../health/index.mjs';
import { RollSettingsConfig } from '../roll/index.mjs';
import { SYSTEM_ID } from '../shared.mjs';
import { SkillSettingsConfig } from '../skills/index.mjs';

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
    type: GameRulesSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Combat Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.COMBAT, {
    name: 'DND35E.Settings.Combat.Name',
    label: 'DND35E.Settings.Combat.Label',
    hint: 'DND35E.Settings.Combat.Hint',
    icon: 'fas fa-swords',
    type: CombatSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Display Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.DISPLAY, {
    name: 'DND35E.Settings.Display.Name',
    label: 'DND35E.Settings.Display.Label',
    hint: 'DND35E.Settings.Display.Hint',
    icon: 'fas fa-display',
    type: DisplaySettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: false, // Client-side settings, available to all users
  });

  // Health Configuration Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.HEALTH, {
    name: 'DND35E.Settings.Health.Name',
    label: 'DND35E.Settings.Health.Label',
    hint: 'DND35E.Settings.Health.Hint',
    icon: 'fas fa-heart-pulse',
    type: HealthSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Roll Configuration Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.ROLL, {
    name: 'DND35E.Settings.RollConfig.Name',
    label: 'DND35E.Settings.RollConfig.Label',
    hint: 'DND35E.Settings.RollConfig.Hint',
    icon: 'fas fa-dice-d20',
    type: RollSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Currency Configuration Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.CURRENCY, {
    name: 'DND35E.Settings.Currency.Name',
    label: 'DND35E.Settings.Currency.Label',
    hint: 'DND35E.Settings.Currency.Hint',
    icon: 'fas fa-coins',
    type: CurrencySettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });

  // Skill Settings Menu
  game.settings.registerMenu(SYSTEM_ID, SETTING_MENUS.SKILLS, {
    name: 'DND35E.Settings.SkillSettings.Name',
    label: 'DND35E.Settings.SkillSettings.Label',
    hint: 'DND35E.Settings.SkillSettings.Hint',
    icon: 'fas fa-book-open',
    type: SkillSettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });
}

export { registerSettingsMenus };
