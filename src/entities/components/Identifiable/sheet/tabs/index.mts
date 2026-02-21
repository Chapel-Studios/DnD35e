import type { SheetTab } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';

import IdentifiableDescription from './IdentifiableDescription.vue';

const identifiableDescriptionTab: SheetTab = {
  id: 'description',
  label: 'D35E.Description',
  component: IdentifiableDescription,
  order: 10,
};

export {
  IdentifiableDescription,
  identifiableDescriptionTab,
};
