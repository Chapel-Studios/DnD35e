/**
 * Default values for complex settings
 */

import type { CurrencyConfig, HealthConfig, RollConfig, WorldDefaults } from '../_types.mjs';

const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  hitdice: {
    PC: { auto: false, rate: 0.5, maximized: '1' },
    NPC: { auto: false, rate: 0.5, maximized: '0' },
    Racial: { auto: false, rate: 0.5, maximized: '0' },
  },
  rounding: 'up',
  continuity: 'discrete',
  variants: {
    pc: { useWoundsAndVigor: false },
    npc: { useWoundsAndVigor: false },
  },
};

const DEFAULT_ROLL_CONFIG: RollConfig = {
  skipDialogs: false,
  autoApplyDamage: false,
  showBreakdown: true,
};

const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  names: '',
  conversionRates: {
    pp: 10,
    gp: 1,
    sp: 0.1,
    cp: 0.01,
  },
};

const DEFAULT_WORLD_DEFAULTS: WorldDefaults = {
  defaultActorType: 'character',
  autoEncumbrance: true,
};

export const defaults = {
  HEALTH_CONFIG: DEFAULT_HEALTH_CONFIG,
  ROLL_CONFIG: DEFAULT_ROLL_CONFIG,
  CURRENCY_CONFIG: DEFAULT_CURRENCY_CONFIG,
  WORLD_DEFAULTS: DEFAULT_WORLD_DEFAULTS,
} as const;

export type DefaultTypes = {
  HealthConfig: typeof DEFAULT_HEALTH_CONFIG;
  RollConfig: typeof DEFAULT_ROLL_CONFIG;
  CurrencyConfig: typeof DEFAULT_CURRENCY_CONFIG;
  WorldDefaults: typeof DEFAULT_WORLD_DEFAULTS;
};
