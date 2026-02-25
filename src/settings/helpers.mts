/**
 * Settings Helper Functions
 *
 * Utility functions for getting and setting system settings.
 */

import { SETTINGS, SYSTEM_ID } from './constants/index.mjs';

/**
 * Helper function to get a typed setting value
 */
function getSetting<K extends keyof typeof SETTINGS>(
  key: (typeof SETTINGS)[K]
): unknown {
  return game.settings.get(SYSTEM_ID, key);
}

/**
 * Helper function to set a typed setting value
 */
async function setSetting<K extends keyof typeof SETTINGS>(
  key: (typeof SETTINGS)[K],
  value: unknown
): Promise<unknown> {
  return game.settings.set(SYSTEM_ID, key, value);
}

const helpers = {
  getSetting,
  setSetting,
} as const;

export {
  getSetting,
  setSetting,
  helpers,
};
