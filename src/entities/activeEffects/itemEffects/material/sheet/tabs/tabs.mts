import { SheetTab } from '@ec/CoreMixin/sheet/useDocumentSheetStore.mjs';
import { MaterialDetails } from '@itemEffects/material/index.mjs';

const materialDetailsTab: SheetTab = {
  id: 'material-details',
  // TODO find this actual label, like D35E.Name
  label: 'Details',
  component: MaterialDetails,
  order: 30,
};

export {
  materialDetailsTab,
};
