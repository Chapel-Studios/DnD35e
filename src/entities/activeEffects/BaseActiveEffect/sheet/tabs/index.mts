import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import Tint from '../components/Tint.vue';
import EffectChanges from './EffectChanges.vue';
import EffectDetails from './EffectDetails.vue';
import EffectDuration from './EffectDuration.vue';

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
  EffectChanges,
  effectChangesTab,
  EffectDetails,
  EffectDetailsTab,
  EffectDuration,
  effectDurationTab,
  getDefaultActiveEffectTabs,
  Tint,
};
