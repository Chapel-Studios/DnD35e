import type { AbilityKey } from './abilities.mjs';
import {
  ABILITY_KEYS,
  ABILITY_KEYS_LOCALIZED,
  CHA,
  CON,
  DEX,
  INT,
  STR,
  WIS,
} from './abilities.mjs';
import type { LawAxis, MoralAxis } from './alignment.mjs';
import {
  ALIGNMENT_I18N,
  CHAOTIC,
  EVIL,
  GOOD,
  LAW_AXES,
  LAW_AXIS_SELECT_OPTIONS,
  LAWFUL,
  MORAL_AXES,
  MORAL_AXIS_SELECT_OPTIONS,
  NEUTRAL,
} from './alignment.mjs';
import {
  ActionsTypesList,
  ActionTypes,
  DAMAGE_TYPES,
  isAttackAction,
} from './attacks/index.mjs';
import {
  BONUS_TYPE_BROKEN,
  BONUS_TYPE_MASTERWORK,
  BONUS_TYPE_MATERIAL,
  BONUS_TYPES,
  type BonusType,
} from './bonusTypes.mjs';
import {
  BROKEN_ARMOR_AE_UUID,
  BROKEN_WEAPON_AE_UUID,
  MASTERWORK_ARMOR_AE_UUID,
  MASTERWORK_WEAPON_AE_UUID,
} from './compendiumUuids.mjs';
import { EffectConfig, ItemConfig } from './config/index.mjs';
import { ITEM_SHEET_CLASS, SETTINGS_CONFIG_CLASS, VUE_APP_CLASS } from './cssClasses.mjs';
import { devConfig } from './devConfig.mjs';
import { 
  EQUIP_SLOT_SELECT_OPTIONS,
  EQUIP_SLOTS,
} from './equipmentSlots.mjs';
import { defaultGameSettings } from './gameSettings/index.mjs';
import { LogLevel } from './logging.mjs';
import { hbsTemplatePath, systemPath } from './paths.mjs';
import { SIZE_MODIFIERS, SIZE_SELECT_OPTIONS, SIZES } from './sizes.mjs';
import type {
  FlyManeuverability,
  SpeedType,
} from './speeds.mjs';
import {
  FLY_MANEUVERABILITIES,
  FLY_MANEUVERABILITY,
  FLY_MANEUVERABILITY_LOCALIZED,
  FLY_MANEUVERABILITY_OPTIONS,
  SPEED_KEYS_LOCALIZED,
  SPEED_TYPE,
  SPEED_TYPES,
} from './speeds.mjs';

export {
  ABILITY_KEYS,
  ABILITY_KEYS_LOCALIZED,
  ActionsTypesList,
  ActionTypes,
  ALIGNMENT_I18N,
  BONUS_TYPE_BROKEN,
  BONUS_TYPE_MASTERWORK,
  BONUS_TYPE_MATERIAL,
  BONUS_TYPES,
  BROKEN_ARMOR_AE_UUID,
  BROKEN_WEAPON_AE_UUID,
  CHA,
  CHAOTIC,
  CON,
  DAMAGE_TYPES,
  defaultGameSettings,
  devConfig,
  DEX,
  EffectConfig,
  EQUIP_SLOT_SELECT_OPTIONS,
  EQUIP_SLOTS,
  EVIL,
  FLY_MANEUVERABILITIES,
  FLY_MANEUVERABILITY,
  FLY_MANEUVERABILITY_LOCALIZED,
  FLY_MANEUVERABILITY_OPTIONS,
  GOOD,
  hbsTemplatePath,
  INT,
  isAttackAction,
  ITEM_SHEET_CLASS,
  ItemConfig,
  LAW_AXES,
  LAW_AXIS_SELECT_OPTIONS,
  LAWFUL,
  LogLevel,
  MASTERWORK_ARMOR_AE_UUID,
  MASTERWORK_WEAPON_AE_UUID,
  MORAL_AXES,
  MORAL_AXIS_SELECT_OPTIONS,
  NEUTRAL,
  SETTINGS_CONFIG_CLASS,
  SIZE_MODIFIERS,
  SIZE_SELECT_OPTIONS,
  SIZES,
  SPEED_KEYS_LOCALIZED,
  SPEED_TYPE,
  SPEED_TYPES,
  STR,
  systemPath,
  VUE_APP_CLASS,
  WIS,
};

export type {
  AbilityKey,
  BonusType,
  FlyManeuverability,
  LawAxis,
  MoralAxis,
  SpeedType,
};
