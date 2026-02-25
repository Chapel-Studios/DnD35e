/**
 * Complex configuration object settings registration
 */

import {
  DEFAULT_CURRENCY_CONFIG,
  DEFAULT_HEALTH_CONFIG,
  DEFAULT_ROLL_CONFIG,
  DEFAULT_WORLD_DEFAULTS,
  SETTINGS,
  SYSTEM_ID,
} from '../constants/index.mjs';

/**
 * Register complex configuration object settings
 */
function registerConfigSettings(): void {
  game.settings.register(SYSTEM_ID, SETTINGS.HEALTH_CONFIG, {
    name: 'DND35E.Settings.Health.Name',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_HEALTH_CONFIG,
    onChange: () => {
      // Trigger actor updates when health config changes
      for (const actor of game.actors ?? []) {
        actor.reset();
      }
    },
  });

  game.settings.register(SYSTEM_ID, SETTINGS.ROLL_CONFIG, {
    name: 'DND35E.Settings.RollConfig',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_ROLL_CONFIG,
  });

  game.settings.register(SYSTEM_ID, SETTINGS.CURRENCY_CONFIG, {
    name: 'DND35E.Settings.CurrencyConfig',
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

  game.settings.register(SYSTEM_ID, SETTINGS.WORLD_DEFAULTS, {
    name: 'DND35E.Settings.WorldDefaults',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_WORLD_DEFAULTS,
  });
}

export {
  registerConfigSettings,
};
