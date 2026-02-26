/**
 * Health settings constants
 */

import type { HealthConfig, HitDieConfig } from './_types.mjs';

/** Health config setting key */
export const HEALTH_KEY = 'healthConfig';

/** Health settings menu key */
export const HEALTH_MENU = 'healthConfig';

/** Default hit die configuration */
const DEFAULT_HITDIE_CONFIG: HitDieConfig = {
  auto: false,
  rate: 0.5,
  maximized: '1',
};

/** Default health configuration */
export const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  hitdice: {
    PC: { ...DEFAULT_HITDIE_CONFIG, maximized: '1' },
    NPC: { ...DEFAULT_HITDIE_CONFIG, maximized: '0' },
    Racial: { ...DEFAULT_HITDIE_CONFIG, maximized: '0' },
  },
  rounding: 'up',
  continuity: 'discrete',
  variants: {
    pc: { useWoundsAndVigor: false },
    npc: { useWoundsAndVigor: false },
  },
};

export type { HealthConfig, HitDieConfig };
