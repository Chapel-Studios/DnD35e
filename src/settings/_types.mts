/**
 * Type definitions for dnd35e system settings
 */

/**
 * Diagonal movement calculation rules
 */
export type DiagonalMovementRule = '555' | '5105';

/**
 * Experience progression rate
 */
export type ExperienceRate = 'slow' | 'medium' | 'fast';

/**
 * Unit of measurement system
 */
export type UnitSystem = 'imperial' | 'metric';

/**
 * Party HUD display mode
 */
export type PartyHudMode = 'full' | 'narrow' | 'none';

/**
 * Hit die computation method
 */
export interface HitDieConfig {
  /** Whether to auto-compute HP */
  auto: boolean;
  /** Rate multiplier for HP calculation */
  rate: number;
  /** Number of levels to maximize HD */
  maximized: string;
}

/**
 * Health configuration settings
 */
export interface HealthConfig {
  hitdice: {
    PC: HitDieConfig;
    NPC: HitDieConfig;
    Racial: HitDieConfig;
  };
  /** Rounding mode for HP calculations */
  rounding: 'up' | 'nearest' | 'down';
  /** HP continuity mode */
  continuity: 'continuous' | 'discrete';
  /** Variant health rules */
  variants: {
    pc: { useWoundsAndVigor: boolean };
    npc: { useWoundsAndVigor: boolean };
  };
}

/**
 * Roll configuration settings
 */
export interface RollConfig {
  /** Whether to skip dialog for standard rolls */
  skipDialogs: boolean;
  /** Auto-apply damage on hit */
  autoApplyDamage: boolean;
  /** Show attack/damage breakdown */
  showBreakdown: boolean;
}

/**
 * Currency configuration settings
 */
export interface CurrencyConfig {
  /** Custom currency names (comma-separated) */
  names: string;
  /** Conversion rates */
  conversionRates: {
    pp: number;
    gp: number;
    sp: number;
    cp: number;
  };
}

/**
 * World default settings
 */
export interface WorldDefaults {
  /** Default actor type for new actors */
  defaultActorType: string;
  /** Auto-calculate encumbrance */
  autoEncumbrance: boolean;
}

/**
 * All system settings mapped by key
 */
export interface SystemSettings {
  // Core/Hidden settings
  systemMigrationVersion: string;

  // Game Rules
  diagonalMovement: DiagonalMovementRule;
  experienceRate: ExperienceRate;
  disableExperienceTracking: boolean;
  useFractionalBaseBonuses: boolean;
  allowBackgroundSkills: boolean;
  psionicsAreDifferent: boolean;

  // Combat settings
  autosizeWeapons: boolean;
  autoScaleAttacksBab: boolean;
  allowNoAmmo: boolean;
  useAutoAmmoRecovery: boolean;

  // Display settings
  units: UnitSystem;
  showPartyHud: PartyHudMode;
  showPartyHudTokenImage: boolean;
  customSkin: boolean;
  colorblindColors: boolean;
  autoCollapseItemCards: boolean;
  classFeaturesInTabs: boolean;

  // Complex config objects
  healthConfig: HealthConfig;
  rollConfig: RollConfig;
  currencyConfig: CurrencyConfig;
  worldDefaults: WorldDefaults;
}

/**
 * Setting scope - determines where the setting is stored
 */
export type SettingScope = 'world' | 'client';

/**
 * Base setting configuration
 */
export interface SettingConfig<T> {
  name: string;
  hint?: string;
  scope: SettingScope;
  config: boolean;
  type: typeof String | typeof Number | typeof Boolean | typeof Object;
  default: T;
  choices?: Record<string, string>;
  onChange?: (value: T) => void;
  requiresReload?: boolean;
}
