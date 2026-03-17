import { IdentifiableDocumentSheetRenderContext } from '@ec/Identifiable/index.mjs';
import type { PhysicalItem } from '@items/components/Physical/index.mjs';

import ItemHardness from './components/ItemHardness.vue';
import ItemHP from './components/ItemHP.vue';
import ItemPrice from './components/ItemPrice.vue';
import ItemQuantity from './components/ItemQuantity.vue';
import ItemSheetContainerSelector from './components/ItemSheetContainerSelector.vue';
import ItemSheetIsCarriedCheckbox from './components/ItemSheetIsCarriedCheckbox.vue';
import ItemWeight from './components/ItemWeight.vue';
import PhysicalItemSheet from './PhysicalItemSheet.vue';
import type { 
  PhysicalDocumentStore,
  PhysicalItemStore,
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
  ItemWeight,
  PhysicalItemEffects,
  physicalItemEffectsTab,
  PhysicalItemSheet,
  usePhysicalItemStore,
};

type PhysicalItemSheetRenderContext = IdentifiableDocumentSheetRenderContext & {
  document: PhysicalItem;
};

export type {
  PhysicalDocumentStore,
  PhysicalItemSheetRenderContext,
  PhysicalItemStore,
};