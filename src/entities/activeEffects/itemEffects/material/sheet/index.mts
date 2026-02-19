import type {
  MaterialSheetConfig,
  MaterialSheetRenderContext,
} from './MaterialSheet.mjs';
import {
  MaterialSheet,
} from './MaterialSheet.mjs';
import MaterialSheetVue from './MaterialSheet.vue';
import type { MaterialStore } from './MaterialStore.mjs';
import { useMaterialStore } from './MaterialStore.mjs';
import { 
  MaterialDetails,
  materialDetailsTab,
} from './tabs/index.mjs';

export {
  MaterialDetails,
  materialDetailsTab,
  MaterialSheet,
  MaterialSheetVue,
  useMaterialStore,
};

export type {
  MaterialSheetConfig,
  MaterialSheetRenderContext,
  MaterialStore,
};
