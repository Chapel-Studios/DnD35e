/**
 * Shared settings types
 *
 * Cross-cutting type definitions used by multiple settings categories or by
 * consumers that need a unified view of system settings (e.g. the settings
 * store, settings sheet, helpers).
 */

import type { CurrencyConfig } from '../currency/types.mjs';
import type { PartyHudMode, UnitSystem } from '../display/types.mjs';
import type { DamageReductionTypesConfig, DiagonalMovementRule, ExperienceRate } from '../gameRules/types.mjs';
import type { HealthConfig } from '../health/types.mjs';
import type { RollConfig } from '../roll/types.mjs';
import type { SkillSettings } from '../skills/types.mjs';

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
  damageReductionTypes: DamageReductionTypesConfig;

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
