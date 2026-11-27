
<script lang="ts">
  export type WeaponInventoryRowProps = Omit<InventoryItemRowProps, 'typeLabel' | 'item' | 'itemStore'> & {
    item: Weapon;
    itemStore: WeaponStore;
  }
</script>
<script setup lang="ts">
  import type { InventoryItemRowProps } from '@actors/baseActor/sheet/components/InventoryItemRow.vue';
  import InventoryItemRow, { BaseInventoryItemRowPropDefaults } from '@actors/baseActor/sheet/components/InventoryItemRow.vue';

  import type { Weapon } from '../../Weapon.mjs';
  import type { WeaponStore } from '../WeaponStore.mjs';

  const props = withDefaults(defineProps<WeaponInventoryRowProps>(), {
    ...BaseInventoryItemRowPropDefaults,
  });

  const { weaponType } = props.itemStore.documentGetters;
</script>

<template>
  <InventoryItemRow
    v-bind="props"
    :type-label="weaponType"
    empty-icon="fas fa-box-open"
  >
  </InventoryItemRow>
</template>
