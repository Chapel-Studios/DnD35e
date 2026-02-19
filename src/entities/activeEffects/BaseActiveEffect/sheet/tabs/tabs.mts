import type { SheetTab } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';
import {
  EffectChanges,
  EffectDetails,
  EffectDuration,
} from '@effects/BaseActiveEffect/index.mjs';

/**
 * Returns the default tabs for ActiveEffect configuration sheets.
 * These mirror the tabs from Foundry's ActiveEffectConfig:
 * - details: Basic effect information (name, image, description)
 * - duration: Effect duration configuration
 * - changes: List of attribute changes
 */
const EffectDetailsTab: SheetTab = {
  id: 'details',
  label: 'EFFECT.TABS.details',
  component: EffectDetails,
  order: 10,
  icon: 'fa-solid fa-book',
};

const effectDurationTab: SheetTab = {
  id: 'duration',
  label: 'EFFECT.TABS.duration',
  component: EffectDuration,
  order: 20,
  icon: 'fa-solid fa-clock',
};

const effectChangesTab: SheetTab = {
  id: 'changes',
  label: 'EFFECT.TABS.changes',
  component: EffectChanges,
  order: 30,
  icon: 'fa-solid fa-gears',
};

const getDefaultActiveEffectTabs = (): SheetTab[] => [
  EffectDetailsTab,
  effectDurationTab,
  effectChangesTab,
];

export {
  effectChangesTab,
  EffectDetailsTab,
  effectDurationTab,
  getDefaultActiveEffectTabs,
};
