/**
 * Core/Hidden settings registration
 */

import { SETTINGS, SYSTEM_ID } from '../constants/index.mjs';

/**
 * Register core/hidden settings
 */
function registerCoreSettings(): void {
  game.settings.register(SYSTEM_ID, SETTINGS.SYSTEM_MIGRATION_VERSION, {
    name: 'System Migration Version',
    scope: 'world',
    config: false,
    type: String,
    default: '0.0.0',
  });
}

export {
  registerCoreSettings,
};
