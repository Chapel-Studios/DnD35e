/**
 * Core/Hidden settings constants (not shown in UI)
 */

/**
 * Core setting keys for system internals
 */
export const CORE_KEYS = {
  SYSTEM_MIGRATION_VERSION: 'systemMigrationVersion',
  ONBOARDING: '__onboarding',
  ONBOARDING_HIDDEN: '__onboardingHidden',
  DEMO_WORLD: 'demoWorld',

  // API Keys
  API_KEY_WORLD: 'apiKeyWorld',
  API_KEY_PERSONAL: 'apiKeyPersonal',
  USER_KEY: 'user-key',

  // Compendium Caches
  ADDITIONAL_COMPENDIUMS_CLASS_ABILITIES: 'additionalCachedCompendiums_classAbilities',
  ADDITIONAL_COMPENDIUMS_RACIAL_ABILITIES: 'additionalCachedCompendiums_racialAbilities',
  ADDITIONAL_COMPENDIUMS_SPELL_LIKE_ABILITIES: 'additionalCachedCompendiums_spellLikeAbilities',
  ADDITIONAL_COMPENDIUMS_MATERIALS: 'additionalCachedCompendiums_materials',
  ADDITIONAL_COMPENDIUMS_DAMAGE_TYPES: 'additionalCachedCompendiums_damageTypes',
} as const;
