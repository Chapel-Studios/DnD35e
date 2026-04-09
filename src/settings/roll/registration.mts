/**
 * Roll settings registration
 */

import { SYSTEM_ID } from '../shared.mjs';
import { DEFAULT_ROLL_CONFIG,ROLL_KEY } from './constants.mjs';

/**
 * Register roll settings
 */
function registerRollSettings(): void {
  game.settings.register(SYSTEM_ID, ROLL_KEY, {
    name: 'DND35E.Settings.RollConfig',
    scope: 'world',
    config: false,
    type: Object,
    default: DEFAULT_ROLL_CONFIG,
  });
}

export {
  registerRollSettings,
};
