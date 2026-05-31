import type { AbilityKey } from './abilities.mjs';
import { ABILITY_KEYS, ABILITY_KEYS_LOCALIZED } from './abilities.mjs';
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
import { ActionsTypesList, ActionTypes, DAMAGE_TYPES, isAttackAction } from './attacks/index.mjs';
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
import { EQUIP_SLOT_SELECT_OPTIONS,EQUIP_SLOTS } from './equipmentSlots.mjs';
import { defaultGameSettings } from './gameSettings/index.mjs';
import { LogLevel } from './logging.mjs';
import { hbsTemplatePath,systemPath } from './paths.mjs';
import { SIZE_SELECT_OPTIONS, SIZES } from './sizes.mjs';

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
  CHAOTIC,
  DAMAGE_TYPES,
  defaultGameSettings,
  devConfig,
  EffectConfig,
  EQUIP_SLOT_SELECT_OPTIONS,
  EQUIP_SLOTS,
  EVIL,
  GOOD,
  hbsTemplatePath,
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
  SIZE_SELECT_OPTIONS,
  SIZES,
  systemPath,
  VUE_APP_CLASS,
};

export type {
  AbilityKey,
  BonusType,
  LawAxis,
  MoralAxis,
};
