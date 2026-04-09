/**
 * Core/Hidden settings registration and main registration orchestration
 */

import { SYSTEM_ID } from '@settings/shared.mjs';

import { registerCurrencySettings } from '../currency/index.mjs';
import { registerDisplaySettings } from '../display/index.mjs';
import { registerGameRulesSettings } from '../gameRules/index.mjs';
import { CORE_KEYS } from './constants.mjs';
import { registerSettingsMenus } from './menus.mjs';

/**
 * Register core/hidden settings (not shown in UI)
 */
function registerCoreSettings(): void {
  game.settings.register(SYSTEM_ID, CORE_KEYS.SYSTEM_MIGRATION_VERSION, {
    name: 'System Migration Version',
    scope: 'world',
    config: false,
    type: String,
    default: '0.0.0',
  });

  // Compendium Cache Settings
  // game.settings.register(SYSTEM_ID, CORE_KEYS.ADDITIONAL_COMPENDIUMS_CLASS_ABILITIES, {
  //   name: 'dnd35e.SETTINGS.AdditionalCompendiums.ClassAbilities.Name',
  //   hint: 'dnd35e.SETTINGS.AdditionalCompendiums.ClassAbilities.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: String,
  //   default: '',
  //   onChange: () => {
  //     window.location.reload();
  //   },
  // });

  // game.settings.register(SYSTEM_ID, CORE_KEYS.ADDITIONAL_COMPENDIUMS_RACIAL_ABILITIES, {
  //   name: 'dnd35e.SETTINGS.AdditionalCompendiums.RacialAbilities.Name',
  //   hint: 'dnd35e.SETTINGS.AdditionalCompendiums.RacialAbilities.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: String,
  //   default: '',
  //   onChange: () => {
  //     window.location.reload();
  //   },
  // });

  // game.settings.register(SYSTEM_ID, CORE_KEYS.ADDITIONAL_COMPENDIUMS_SPELL_LIKE_ABILITIES, {
  //   name: 'dnd35e.SETTINGS.AdditionalCompendiums.SpellLikeAbilities.Name',
  //   hint: 'dnd35e.SETTINGS.AdditionalCompendiums.SpellLikeAbilities.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: String,
  //   default: '',
  //   onChange: () => {
  //     window.location.reload();
  //   },
  // });

  // game.settings.register(SYSTEM_ID, CORE_KEYS.ADDITIONAL_COMPENDIUMS_MATERIALS, {
  //   name: 'dnd35e.SETTINGS.AdditionalCompendiums.Materials.Name',
  //   hint: 'dnd35e.SETTINGS.AdditionalCompendiums.Materials.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: String,
  //   default: '',
  //   onChange: () => {
  //     window.location.reload();
  //   },
  // });

  // game.settings.register(SYSTEM_ID, CORE_KEYS.ADDITIONAL_COMPENDIUMS_DAMAGE_TYPES, {
  //   name: 'dnd35e.SETTINGS.AdditionalCompendiums.DamageTypes.Name',
  //   hint: 'dnd35e.SETTINGS.AdditionalCompendiums.DamageTypes.Hint',
  //   scope: 'world',
  //   config: false,
  //   type: String,
  //   default: '',
  //   onChange: () => {
  //     window.location.reload();
  //   },
  // });
}

/**
 * Register all system settings.
 * Called during system initialization (Hooks.once('init')).
 */
function registerSettings(): void {
  console.log(`${SYSTEM_ID} | Registering system settings`);

  // registerRootSettings();
  registerCoreSettings();
  registerSettingsMenus();
  registerGameRulesSettings();
  // registerCombatSettings();
  registerDisplaySettings();
  // registerHealthSettings();
  // registerRollSettings();
  registerCurrencySettings();
  // registerSkillsSettings();

  console.log(`${SYSTEM_ID} | Settings registration complete`);
}

export {
  registerCoreSettings,
  registerSettings,
  registerSettingsMenus,
};
