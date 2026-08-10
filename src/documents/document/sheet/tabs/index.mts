import PreparationWarningsTab from '../components/PreparationWarningsTab.vue';
import type { SheetTab } from '../DocumentSheetStore.mjs';
import DocumentDetails from './DocumentDetails.vue';

const defaultDetailsTab: SheetTab = {
  id: 'details',
  label: 'dnd35e.COMMON.Description',
  component: DocumentDetails,
  order: 10,
};

/** Conditional tab shown only while `_preparationWarnings` is non-empty - stays until fixed, not dismissable (see `preparationWarnings.mts`). */
const preparationWarningsTab: SheetTab = {
  id: 'preparation-warnings',
  label: 'dnd35e.COMMON.PreparationWarningsTab',
  component: PreparationWarningsTab,
  order: 999,
  icon: 'fas fa-triangle-exclamation',
};

export {
  defaultDetailsTab,
  DocumentDetails,
  preparationWarningsTab,
};
