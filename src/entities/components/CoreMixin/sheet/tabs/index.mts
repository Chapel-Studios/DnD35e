import { SheetTab } from '../useDocumentSheetStore.mjs';
import DocumentDetails from './DocumentDetails.vue';

const defaultDetailsTab: SheetTab = {
  id: 'details',
  label: 'D35E.Description',
  component: DocumentDetails,
  order: 10,
};

export {
  defaultDetailsTab,
  DocumentDetails,
};
