import type { SheetTab } from '@documents/document/index.mjs';

import ContainerDetails from './ContainerDetails.vue';
import ContainerInventory from './ContainerInventory.vue';

const containerDetailsTab: SheetTab = {
  id: 'details',
  label: 'dnd35e.CONTAINER.Tabs.details',
  component: ContainerDetails,
  order: 40,
};

const containerInventoryTab: SheetTab = {
  id: 'inventory',
  label: 'dnd35e.CONTAINER.Tabs.inventory',
  component: ContainerInventory,
  order: 50,
};

export {
  ContainerDetails,
  containerDetailsTab,
  ContainerInventory,
  containerInventoryTab,
};
