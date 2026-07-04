import { DEFAULT_AVAILABLE_LANGUAGES_OPTIONS } from '@constants/languages.mjs';
import { SIZES } from '@constants/sizes.mjs';
import { registerConfigPreLocalization } from '@helpers/localization/preLocalizeConfig.mjs';
import { WEAPON_TYPES } from '@items/physical/weapon/data/constants.mjs';
import { DEFAULT_DAMAGE_REDUCTION_TYPES } from '@settings/gameRules/constants.mjs';

const SIZES_CONFIG = Object.fromEntries(
  SIZES.map(size => [size, { label: `dnd35e.SIZE.${size}` }])
);

/**
 * Build damage reduction types config with i18n key labels.
 * These will be pre-localized at i18nInit to replace i18n keys with localized strings.
 */
const DAMAGE_REDUCTION_TYPES_CONFIG = Object.fromEntries(
  Object.entries(DEFAULT_DAMAGE_REDUCTION_TYPES).map(([key, entry]) => [
    key,
    { label: entry.label }, // i18n key, to be pre-localized
  ])
);

const DEFAULT_AVAILABLE_LANGUAGES_CONFIG = Object.fromEntries(
  Object.entries(DEFAULT_AVAILABLE_LANGUAGES_OPTIONS).map(([key, entry]) => [
    key,
    { label: entry.label }, // i18n key, to be pre-localized
  ])
);

const WEAPON_TYPES_CONFIG = Object.fromEntries(
  Array.from(WEAPON_TYPES).map(type => [type, { label: `dnd35e.WEAPON.Type.${type}` }])
);

/**
 * dnd35e system configuration object.
 * Attached to CONFIG.dnd35e during system initialization.
 * Contains custom document classes and system-level settings.
 */
const SystemConfig = {
  VERSION: '13.0.0-dev.1',
  item: {
    enums: {
      sizes: SIZES_CONFIG,
      weaponTypes: WEAPON_TYPES_CONFIG,
    },
    documentClasses: {
    },
  },
  activeEffect: {
    documentClasses: {
    },
  },
  gameRules: {
    damageReductionTypes: DAMAGE_REDUCTION_TYPES_CONFIG,
    availableLanguageOptions: DEFAULT_AVAILABLE_LANGUAGES_CONFIG,
  },
  actor: {
    documentClasses: {
    },
  },
};

registerConfigPreLocalization('item.enums.sizes', { key: 'label' });
registerConfigPreLocalization('item.enums.weaponTypes', { key: 'label' });
registerConfigPreLocalization('gameRules.damageReductionTypes', { key: 'label' });
registerConfigPreLocalization('gameRules.availableLanguageOptions', { key: 'label' });

export { SystemConfig };
