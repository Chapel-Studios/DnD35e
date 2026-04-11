import { SheetTab } from '../DocumentSheetStore.mjs';
import DocumentDetails from './DocumentDetails.vue';

const defaultDetailsTab: SheetTab = {
  id: 'details',
  label: 'dnd35e.COMMON.Description',
  component: DocumentDetails,
  order: 10,
};

export {
  defaultDetailsTab,
  DocumentDetails,
};
