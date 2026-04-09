/**
 * Health settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import { DEFAULT_HEALTH_CONFIG,HEALTH_KEY } from './constants.mjs';

/**
 * Register health settings
 */
function registerHealthSettings(): void {
  game.settings.register(SYSTEM_ID, HEALTH_KEY, {
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
}

export {
  registerHealthSettings,
};
