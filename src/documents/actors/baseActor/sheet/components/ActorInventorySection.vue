<template>
  <SheetSection
    header="dnd35e.ACTOR.section.inventory"
    class="inventory-section"
  >
    <template #header-controls>
      <button
        type="button"
        class="field-control-btn"
        :title="paneStore.isOpen.value
          ? localize('dnd35e.ACTOR.inventory.silhouette.action.close')
          : localize('dnd35e.ACTOR.inventory.silhouette.action.open')"
        @click="paneStore.toggle()"
      >
        <i :class="iconClass" />
      </button>
    </template>

    <template #list>
      <InventoryListTable
        :items="carriedItems"
        :is-carried="true"
        title="dnd35e.ACTOR.inventory.section.carried"
        empty-label="dnd35e.ACTOR.inventory.emptyCarried"
        toggle-title="dnd35e.ACTOR.inventory.action.moveToTracked"
      />

      <InventoryListTable
        :items="storedItems"
        :is-carried="false"
        title="dnd35e.ACTOR.inventory.section.tracked"
        empty-label="dnd35e.ACTOR.inventory.emptyTracked"
        toggle-title="dnd35e.ACTOR.inventory.action.moveToCarried"
      />
    </template>
  </SheetSection>
</template>

<script setup lang="ts">
  import {
    type EquipmentPaneStore,
    EquipmentPaneStoreSymbol,
  } from '@actors/creature/sheet/EquipmentPaneStore.mjs';
  import SheetSection from '@actors/creature/sheet/tabs/sections/SheetSection.vue';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { PhysicalItem } from '@items/physical/physicalItem/PhysicalItem.mjs';
  import { computed, inject } from 'vue';

  import type { ActorStore } from '../ActorSheetStore.mjs';
  import InventoryListTable from './InventoryListTable.vue';

  const localize = (key: string): string => game.i18n.localize(key);
  const paneStore = inject(EquipmentPaneStoreSymbol) as EquipmentPaneStore;
  const { documentGetters: { physicalItems } } = inject(DocumentSheetStoreSymbol) as ActorStore;

  const carriedItems = computed(() => physicalItems.value.filter(
    (item) => (item instanceof PhysicalItem)
      && item.system.isCarried
  ));
  const storedItems = computed(() => physicalItems.value.filter(
    (item) => (item instanceof PhysicalItem)
      && !item.system.isCarried
  ));

  const iconClass = computed((): string => {
    return paneStore.isOpen.value
      ? 'fa-sharp fa-solid fa-person-circle-minus'
      : 'fa-sharp fa-solid fa-person-circle-plus';
  });
</script>

<style scoped lang="scss">

</style>
