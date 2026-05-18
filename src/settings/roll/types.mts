/**
 * Type definitions for roll settings
 */

/**
 * Roll mode per roll type configuration
 */
export interface RollModeConfig {
  attack: string;
  applyDamage: string;
  savingThrow: string;
  skill: string;
  grapple: string;
  hpRoll: string;
}

/**
 * Roll configuration settings per actor type
 */
export interface RollConfig {
  rollConfig: {
    character: RollModeConfig;
    npc: RollModeConfig;
    trap: RollModeConfig;
  };
}
