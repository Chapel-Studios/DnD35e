import DamageReductionTypes from './components/DamageReductionTypes.vue';
import MagicEquivalency from './components/MagicEquivalency.vue';
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
  MaterialChanges,
  materialChangesTab,
  MaterialDetails,
  materialDetailsTab,
} from './tabs/index.mjs';

export {
  DamageReductionTypes,
  MagicEquivalency,
  MaterialChanges,
  materialChangesTab,
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
