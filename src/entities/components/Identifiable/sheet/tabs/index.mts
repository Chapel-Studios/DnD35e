import type { SheetTab } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';

import IdentifiableDetails from './IdentifiableDetails.vue';

const identifiableDescriptionTab: SheetTab = {
  id: 'details',
  label: 'D35E.Description',
  component: IdentifiableDetails,
  order: 10,
};

export {
  identifiableDescriptionTab,
  IdentifiableDetails,
};
