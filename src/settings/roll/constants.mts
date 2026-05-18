/**
 * Roll settings constants
 */

import type { RollConfig, RollModeConfig } from './types.mjs';

/** Roll config setting key */
export const ROLL_KEY = 'rollConfig';

/** Roll settings menu key */
export const ROLL_MENU = 'rollConfig';

/** Default roll mode configuration */
const DEFAULT_ROLL_MODE_CONFIG: RollModeConfig = {
  attack: '',
  applyDamage: '',
  savingThrow: '',
  skill: '',
  grapple: '',
  hpRoll: '',
};

/** Default roll configuration */
export const DEFAULT_ROLL_CONFIG: RollConfig = {
  rollConfig: {
    character: { ...DEFAULT_ROLL_MODE_CONFIG },
    npc: { ...DEFAULT_ROLL_MODE_CONFIG },
    trap: { ...DEFAULT_ROLL_MODE_CONFIG },
  },
};

export type { RollConfig, RollModeConfig };
