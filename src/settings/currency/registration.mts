/**
 * Currency settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import { CURRENCY_KEY, CURRENCY_MENU, DEFAULT_CURRENCY_CONFIG } from './constants.mjs';
import { CurrencySettingsConfig } from './sheet/index.mjs';

/**
 * Register the Currency settings menu button
 */
function registerCurrencyMenu(): void {
  game.settings.registerMenu(SYSTEM_ID, CURRENCY_MENU, {
    name: 'dnd35e.SETTINGS.Currency.Name',
    label: 'dnd35e.SETTINGS.Currency.Label',
    hint: 'dnd35e.SETTINGS.Currency.Hint',
    icon: 'fas fa-coins',
    type: CurrencySettingsConfig as unknown as ConstructorOf<foundry.applications.api.ApplicationV2>,
    restricted: true,
  });
}

/**
 * Register currency settings
 */
function registerCurrencySettings(): void {
  registerCurrencyMenu();
  game.settings.register(SYSTEM_ID, CURRENCY_KEY, {
    name: 'dnd35e.SETTINGS.CurrencyConfig',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_CURRENCY_CONFIG,
    onChange: () => {
      // Trigger actor updates when currency config changes
      for (const actor of game.actors ?? []) {
        actor.reset();
      }
    },
  });
}

export {
  registerCurrencySettings,
};
