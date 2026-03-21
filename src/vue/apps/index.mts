/**
 * Vue application utilities
 *
 * This module exports shared Vue mixins and base classes.
 * Settings-specific Vue components are in their respective settings folders.
 */

import { VueActiveEffectConfig } from './VueActiveEffectConfig.mjs';
import type { VueAppBaseMembers, VueAppBaseMixin } from './VueAppBaseMixin.mjs';
import { useVueAppBaseMixin } from './VueAppBaseMixin.mjs';
import type {
  EditorViewMode,
  SheetState,
  VueApplicationConfiguration,
  VueApplicationContext,
  VueApplicationContextTransfer,
  VueRenderOptions,
} from './VueAppTypes.mjs';
import type { VueDocumentSheetMembers, VueDocumentSheetMixin } from './VueDocumentSheetMixin.mjs';
import { useVueDocumentSheetMixin } from './VueDocumentSheetMixin.mjs';
import { VueItemSheet } from './VueItemSheet.mjs';
import type {
  VueSettingsContext,
  VueSettingsMembers,
  VueSettingsMixin,
  VueSettingsRenderOptions,
} from './VueSettingsMixin.mjs';
import { useVueSettingsMixin } from './VueSettingsMixin.mjs';

export {
  useVueAppBaseMixin,
  useVueDocumentSheetMixin,
  useVueSettingsMixin,
  VueActiveEffectConfig,
  VueItemSheet,
};

export type {
  EditorViewMode,
  SheetState,
  VueAppBaseMembers,
  VueAppBaseMixin,
  VueApplicationConfiguration,
  VueApplicationContext,
  VueApplicationContextTransfer,
  VueDocumentSheetMembers,
  VueDocumentSheetMixin,
  VueRenderOptions,
  VueSettingsContext,
  VueSettingsMembers,
  VueSettingsMixin,
  VueSettingsRenderOptions,
};

