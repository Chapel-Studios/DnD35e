/**
 * Vue application utilities
 *
 * This module exports shared Vue mixins and base classes.
 * Settings-specific Vue components are in their respective settings folders.
 */

import type { ViewMode } from '@helpers/formulae/types.mjs';

import { VueActiveEffectConfig } from './VueActiveEffectConfig.mjs';
import { VueActorSheet } from './VueActorSheet.mjs';
import type { VueAppBaseMembers, VueAppBaseMixin } from './VueAppBaseMixin.mjs';
import { useVueAppBaseMixin } from './VueAppBaseMixin.mjs';
import type {
  SheetDocumentType,
  SheetState,
  VueApplicationConfiguration,
  VueApplicationContext,
  VueApplicationContextTransfer,
  VueRenderOptions,
} from './VueAppTypes.mjs';
import type { VueDialogContext, VueDialogMembers, VueDialogMixin } from './VueDialogMixin.mjs';
import { useVueDialogMixin } from './VueDialogMixin.mjs';
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
  useVueDialogMixin,
  useVueDocumentSheetMixin,
  useVueSettingsMixin,
  VueActiveEffectConfig,
  VueActorSheet,
  VueItemSheet,
};

export type {
  SheetDocumentType,
  SheetState,
  ViewMode,
  VueAppBaseMembers,
  VueAppBaseMixin,
  VueApplicationConfiguration,
  VueApplicationContext,
  VueApplicationContextTransfer,
  VueDialogContext,
  VueDialogMembers,
  VueDialogMixin,
  VueDocumentSheetMembers,
  VueDocumentSheetMixin,
  VueRenderOptions,
  VueSettingsContext,
  VueSettingsMembers,
  VueSettingsMixin,
  VueSettingsRenderOptions,
};

