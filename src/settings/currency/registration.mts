/**
 * Currency settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import { CURRENCY_KEY, DEFAULT_CURRENCY_CONFIG } from './constants.mjs';

/**
 * Register currency settings
 */
function registerCurrencySettings(): void {
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
