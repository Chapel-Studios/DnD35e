import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import MaterialDetails from './MaterialDetails.vue';

const materialDetailsTab: SheetTab = {
  id: 'details',
  // TODO(Phase 3/5): replace with game.i18n.localize('dnd35e.MATERIAL.Tab.Details')
  label: 'Details',
  component: MaterialDetails,
  order: 10,
};

export {
  MaterialDetails,
  materialDetailsTab,
};