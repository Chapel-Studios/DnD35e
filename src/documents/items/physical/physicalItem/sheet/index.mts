import type { IdentifiableDocumentSheetRenderContext } from '@documents/identifiable/index.mjs';
import type { PhysicalItem } from '@items/physical/physicalItem/index.mjs';

import ItemHardness from './components/ItemHardness.vue';
import ItemHP from './components/ItemHP.vue';
import ItemPrice from './components/ItemPrice.vue';
import ItemQuantity from './components/ItemQuantity.vue';
import ItemSheetContainerSelector from './components/ItemSheetContainerSelector.vue';
import ItemSheetIsCarriedCheckbox from './components/ItemSheetIsCarriedCheckbox.vue';
import ItemSize from './components/ItemSize.vue';
import ItemWeight from './components/ItemWeight.vue';
import PhysicalItemHeaderStatus from './components/PhysicalItemHeaderStatus.vue';
import PhysicalItemSheet from './PhysicalItemSheet.vue';
import type { 
  PhysicalDocumentStore,
  PhysicalItemActions,
  PhysicalItemGetters,
  PhysicalItemStore,
  PhysicalItemStoreUtils,
} from './PhysicalItemStore.mjs';
import { usePhysicalItemStore } from './PhysicalItemStore.mjs';
import {
  PhysicalItemEffects,
  physicalItemEffectsTab,
} from './tabs/index.mjs';

export {
  ItemHardness,
  ItemHP,
  ItemPrice,
  ItemQuantity,
  ItemSheetContainerSelector,
  ItemSheetIsCarriedCheckbox,
  ItemSize,
  ItemWeight,
  PhysicalItemEffects,
  physicalItemEffectsTab,
  PhysicalItemHeaderStatus,
  PhysicalItemSheet,
  usePhysicalItemStore,
};

type PhysicalItemSheetRenderContext = IdentifiableDocumentSheetRenderContext & {
  document: PhysicalItem;
};

export type {
  PhysicalDocumentStore,
  PhysicalItemActions,
  PhysicalItemGetters,
  PhysicalItemSheetRenderContext,
  PhysicalItemStore,
  PhysicalItemStoreUtils,
};