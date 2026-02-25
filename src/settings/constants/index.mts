/**
 * Constants for dnd35e system settings
 */

import { choices, type ChoiceTypes } from './choices.mjs';
import { defaults, type DefaultTypes } from './defaults.mjs';
import { keys, type KeyTypes } from './keys.mjs';

const constants = {
  ...keys,
  ...defaults,
  choices,
} as const;

type ConstantTypes = KeyTypes & DefaultTypes & ChoiceTypes;

// Re-export for convenience (backwards compatibility)
const SYSTEM_ID = keys.SYSTEM_ID;
const SETTINGS = keys.SETTINGS;
const SETTING_MENUS = keys.SETTING_MENUS;
const DEFAULT_HEALTH_CONFIG = defaults.HEALTH_CONFIG;
const DEFAULT_ROLL_CONFIG = defaults.ROLL_CONFIG;
const DEFAULT_CURRENCY_CONFIG = defaults.CURRENCY_CONFIG;
const DEFAULT_WORLD_DEFAULTS = defaults.WORLD_DEFAULTS;
const DIAGONAL_MOVEMENT_CHOICES = choices.DIAGONAL_MOVEMENT;
const EXPERIENCE_RATE_CHOICES = choices.EXPERIENCE_RATE;
const UNIT_CHOICES = choices.UNIT;
const PARTY_HUD_CHOICES = choices.PARTY_HUD;

export {
  constants,
  DEFAULT_CURRENCY_CONFIG,
  DEFAULT_HEALTH_CONFIG,
  DEFAULT_ROLL_CONFIG,
  DEFAULT_WORLD_DEFAULTS,
  DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE_CHOICES,
  PARTY_HUD_CHOICES,
  SETTING_MENUS,
  SETTINGS,
  SYSTEM_ID,
  UNIT_CHOICES,
};

export type {
  ConstantTypes,
};
