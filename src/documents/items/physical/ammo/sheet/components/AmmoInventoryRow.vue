
<script lang="ts">
  export type WeaponInventoryRowProps = Omit<InventoryItemRowProps, 'typeLabel' | 'item' | 'itemStore'> & {
    item: Ammo;
    itemStore: AmmoStore;
  }
</script>
<script setup lang="ts">
  import type { InventoryItemRowProps } from '@actors/baseActor/sheet/components/InventoryItemRow.vue';
  import InventoryItemRow, { BaseInventoryItemRowPropDefaults } from '@actors/baseActor/sheet/components/InventoryItemRow.vue';

  import type { Ammo, AmmoStore } from '../../index.mjs';

  const props = withDefaults(defineProps<WeaponInventoryRowProps>(), {
    ...BaseInventoryItemRowPropDefaults,
  });

  const { ammoTypeLabel } = props.itemStore.documentGetters;
</script>

<template>
  <InventoryItemRow
    v-bind="props"
    :type-label="ammoTypeLabel"
    empty-icon="fas fa-box-open"
  >
  </InventoryItemRow>
</template>
