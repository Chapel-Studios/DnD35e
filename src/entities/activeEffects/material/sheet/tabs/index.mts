import type { SheetTab } from '@ec/CoreMixin/index.mjs';

import MaterialDetails from './MaterialDetails.vue';

const materialDetailsTab: SheetTab = {
  id: 'material-details',
  // TODO find this actual label, like D35E.Name
  label: 'Details',
  component: MaterialDetails,
  order: 10,
};

export {
  MaterialDetails,
  materialDetailsTab,
};