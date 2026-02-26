/**
 * Type definitions for dnd35e system settings
 *
 * Category-specific types are defined in their respective folders.
 * This file re-exports them for backwards compatibility and defines base types.
 */

// Import category types for use in SystemSettings
import type { CurrencyConfig, CurrencyEntry } from './currency/_types.mjs';
import type { PartyHudMode, UnitSystem } from './display/_types.mjs';
import type { DiagonalMovementRule, ExperienceRate } from './gameRules/_types.mjs';
import type { HealthConfig, HitDieConfig } from './health/_types.mjs';
import type { RollConfig, RollModeConfig } from './roll/_types.mjs';
import type { CustomSkill, SkillSettings } from './skills/_types.mjs';

// Re-export category types
export type {
  CurrencyConfig,
  CurrencyEntry,
  CustomSkill,
  DiagonalMovementRule,
  ExperienceRate,
  HealthConfig,
  HitDieConfig,
  PartyHudMode,
  RollConfig,
  RollModeConfig,
  SkillSettings,
  UnitSystem,
};

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

/**
 * All system settings mapped by key
 *
 * Note: This is a comprehensive type that imports from all category modules.
 * For individual setting types, import from the specific category module.
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
  skillSettings: SkillSettings;
}

