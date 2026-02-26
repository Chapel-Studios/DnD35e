/**
 * Constants for dnd35e system settings
 *
 * This file provides unified exports for backwards compatibility.
 * New code should import directly from category modules.
 */

import { COMBAT_KEYS, COMBAT_MENU } from '../combat/index.mjs';
import { CORE_KEYS } from '../core/index.mjs';
import { CURRENCY_KEY, CURRENCY_MENU, DEFAULT_CURRENCY_CONFIG } from '../currency/index.mjs';
import { DISPLAY_KEYS, DISPLAY_MENU, PARTY_HUD_CHOICES, SHARED_VISION_MODE_CHOICES,UNIT_CHOICES } from '../display/index.mjs';
import { DIAGONAL_MOVEMENT_CHOICES, EXPERIENCE_RATE_CHOICES,GAME_RULES_KEYS, GAME_RULES_MENU } from '../gameRules/index.mjs';
import { DEFAULT_HEALTH_CONFIG,HEALTH_KEY, HEALTH_MENU } from '../health/index.mjs';
import { DEFAULT_ROLL_CONFIG,ROLL_KEY, ROLL_MENU } from '../roll/index.mjs';
import { SYSTEM_ID } from '../shared.mjs';
import { DEFAULT_SKILL_SETTINGS,SKILLS_KEY, SKILLS_MENU } from '../skills/index.mjs';

/**
 * Unified SETTINGS object combining all category keys for backwards compatibility
 */
const SETTINGS = {
  // Core/Hidden
  ...CORE_KEYS,
  // Game Rules
  ...GAME_RULES_KEYS,
  // Combat
  ...COMBAT_KEYS,
  // Display
  ...DISPLAY_KEYS,
  // Complex Config Objects
  HEALTH_CONFIG: HEALTH_KEY,
  ROLL_CONFIG: ROLL_KEY,
  CURRENCY_CONFIG: CURRENCY_KEY,
  SKILL_SETTINGS: SKILLS_KEY,
} as const;

/**
 * Setting menu keys
 */
const SETTING_MENUS = {
  GAME_RULES: GAME_RULES_MENU,
  COMBAT: COMBAT_MENU,
  DISPLAY: DISPLAY_MENU,
  HEALTH: HEALTH_MENU,
  ROLL: ROLL_MENU,
  CURRENCY: CURRENCY_MENU,
  SKILLS: SKILLS_MENU,
} as const;

/**
 * Choice objects for select-type settings
 */
const choices = {
  DIAGONAL_MOVEMENT: DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE: EXPERIENCE_RATE_CHOICES,
  UNIT: UNIT_CHOICES,
  PARTY_HUD: PARTY_HUD_CHOICES,
  SHARED_VISION_MODE: SHARED_VISION_MODE_CHOICES,
} as const;

/**
 * Default values for complex settings
 */
const defaults = {
  HEALTH_CONFIG: DEFAULT_HEALTH_CONFIG,
  ROLL_CONFIG: DEFAULT_ROLL_CONFIG,
  CURRENCY_CONFIG: DEFAULT_CURRENCY_CONFIG,
  SKILL_SETTINGS: DEFAULT_SKILL_SETTINGS,
} as const;

const constants = {
  SYSTEM_ID,
  SETTINGS,
  SETTING_MENUS,
  ...defaults,
  choices,
} as const;

type ConstantTypes = {
  Settings: typeof SETTINGS;
  SettingMenus: typeof SETTING_MENUS;
};

export {
  choices,
  constants,
  DEFAULT_CURRENCY_CONFIG,
  DEFAULT_HEALTH_CONFIG,
  DEFAULT_ROLL_CONFIG,
  DEFAULT_SKILL_SETTINGS,
  defaults,
  DIAGONAL_MOVEMENT_CHOICES,
  EXPERIENCE_RATE_CHOICES,
  PARTY_HUD_CHOICES,
  SETTING_MENUS,
  SETTINGS,
  SHARED_VISION_MODE_CHOICES,
  SYSTEM_ID,
  UNIT_CHOICES,
};

export type {
  ConstantTypes,
};
