import type { SheetTab } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';

import IdentifiableDescription from './IdentifiableDescription.vue';
import IdentifiableNameConfig from './IdentifiableNameConfig.vue';

const identifiableDescriptionTab: SheetTab = {
  id: 'description',
  label: 'D35E.Description',
  component: IdentifiableDescription,
  order: 10,
};

const identifiableNameConfigTab: SheetTab = {
  id: 'name-config',
  label: 'D35E.Name',
  component: IdentifiableNameConfig,
  order: 20,
};

export {
  identifiableDescriptionTab,
  identifiableNameConfigTab,
};
