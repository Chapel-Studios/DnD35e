import DocumentHeader from './components/DocumentHeader.vue';
import DocumentName from './components/DocumentName.vue';
import EditModeToggle from './components/EditModeToggle.vue';
import NameArtWrapper from './components/NameArtWrapper.vue';
import type {
  DocumentSheetStore,
  SheetDocument,
  SheetTab,
} from './useDocumentSheetStore.mjs';
import { useDocumentSheetStore } from './useDocumentSheetStore.mjs';

export {
  DocumentHeader,
  DocumentName,
  EditModeToggle,
  NameArtWrapper,
  useDocumentSheetStore,
};

export type {
  DocumentSheetStore,
  SheetDocument,
  SheetTab,
};
