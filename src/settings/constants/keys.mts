/**
 * Setting keys and identifiers
 */

/**
 * System ID used for all settings registration
 */
const SYSTEM_ID = 'dnd35e';

/**
 * Setting keys - use these constants instead of magic strings
 */
const SETTINGS = {
  // Core/Hidden
  SYSTEM_MIGRATION_VERSION: 'systemMigrationVersion',

  // Game Rules
  DIAGONAL_MOVEMENT: 'diagonalMovement',
  EXPERIENCE_RATE: 'experienceRate',
  DISABLE_EXPERIENCE_TRACKING: 'disableExperienceTracking',
  USE_FRACTIONAL_BASE_BONUSES: 'useFractionalBaseBonuses',
  ALLOW_BACKGROUND_SKILLS: 'allowBackgroundSkills',
  PSIONICS_ARE_DIFFERENT: 'psionicsAreDifferent',

  // Combat
  AUTOSIZE_WEAPONS: 'autosizeWeapons',
  AUTO_SCALE_ATTACKS_BAB: 'autoScaleAttacksBab',
  ALLOW_NO_AMMO: 'allowNoAmmo',
  USE_AUTO_AMMO_RECOVERY: 'useAutoAmmoRecovery',
  NO_AUTO_SPELLPOINTS_COST: 'noAutoSpellpointsCost',
  SPELLPOINT_COST_FORMULA: 'spellpointCostCustomFormula',
  LOW_LIGHT_VISION_MODE: 'lowLightVisionMode',
  MEASURE_STYLE: 'measureStyle',

  // Display
  UNITS: 'units',
  SHOW_PARTY_HUD: 'showPartyHud',
  SHOW_PARTY_HUD_TOKEN_IMAGE: 'showPartyHudTokenImage',
  CUSTOM_SKIN: 'customSkin',
  COLORBLIND_COLORS: 'colorblindColors',
  AUTO_COLLAPSE_ITEM_CARDS: 'autoCollapseItemCards',
  CLASS_FEATURES_IN_TABS: 'classFeaturesInTabs',
  HIDE_SPELL_DESCRIPTIONS: 'hideSpellDescriptions',
  TRANSPARENT_SIDEBAR: 'transparentSidebarWhenUsingTheme',

  // Complex Config Objects
  HEALTH_CONFIG: 'healthConfig',
  ROLL_CONFIG: 'rollConfig',
  CURRENCY_CONFIG: 'currencyConfig',
  WORLD_DEFAULTS: 'worldDefaults',
} as const;

/**
 * Setting menu keys
 */
const SETTING_MENUS = {
  GAME_RULES: 'gameRulesConfig',
  COMBAT: 'combatConfig',
  DISPLAY: 'displayConfig',
  HEALTH: 'healthConfig',
} as const;

export const keys = {
  SYSTEM_ID,
  SETTINGS,
  SETTING_MENUS,
} as const;

export type KeyTypes = {
  Settings: typeof SETTINGS;
  SettingMenus: typeof SETTING_MENUS;
};
