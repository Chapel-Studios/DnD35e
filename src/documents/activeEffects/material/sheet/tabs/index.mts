import type { SheetTab } from '@documents/document/index.mjs';

import MaterialChanges from './MaterialChanges.vue';
import MaterialDetails from './MaterialDetails.vue';

const materialDetailsTab: SheetTab = {
  id: 'details',
  // TODO(Phase 3/5): replace with game.i18n.localize('dnd35e.MATERIAL.Tab.Details')
  label: 'Details',
  component: MaterialDetails,
  order: 10,
};

const materialChangesTab: SheetTab = {
  id: 'changes',
  label: 'EFFECT.TABS.changes',
  component: MaterialChanges,
  order: 30,
  icon: 'fa-solid fa-gears',
};

export {
  MaterialChanges,
  materialChangesTab,
  MaterialDetails,
  materialDetailsTab,
};