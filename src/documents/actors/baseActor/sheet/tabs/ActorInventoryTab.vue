<template>
  <div class="actor-tab inventory-tab">
    <ActorInventorySection>
      <template v-if="slots.top" #top>
        <slot name="top" />
      </template>
      <template v-if="slots.bottom" #bottom>
        <slot name="bottom" />
      </template>
    </ActorInventorySection>
    <slot name="append-section" />
  </div>
</template>

<script setup lang="ts">
  import ActorInventorySection from '@actors/baseActor/sheet/components/ActorInventorySection.vue';
  import type { EquipmentPaneStore } from '@actors/creature/sheet/EquipmentPaneStore.mjs';
  import { EquipmentPaneStoreSymbol } from '@actors/creature/sheet/EquipmentPaneStore.mjs';
  import { type TabStore,TabStoreSymbol } from '@documents/document/index.mjs';
  import { inject, watch } from 'vue';

  const paneStore = inject(EquipmentPaneStoreSymbol) as EquipmentPaneStore;
  const { activeTabId } = inject(TabStoreSymbol) as TabStore;

  const slots = defineSlots();

  watch(activeTabId, (nextTabId) => {
    if (nextTabId !== 'inventory') {
      paneStore.close();
    }
  });
</script>

<style scoped lang="scss">
  .inventory-tab {
    display: grid;
    gap: 0.75rem;
  }
</style>
