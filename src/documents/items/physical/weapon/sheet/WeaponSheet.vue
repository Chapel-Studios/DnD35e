<template>
  <PhysicalItemSheet>
    <template #header-summary>
      <WeaponSummary />
    </template>
    <template #header-status>
      <EquippableHeaderStatus />
    </template>
  </PhysicalItemSheet>
</template>

<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { EquippableHeaderStatus } from '@items/physical/equippableItem/index.mjs';
  import { PhysicalItemSheet } from '@items/physical/physicalItem/index.mjs';
  import { useWeaponStore, WeaponSummary } from '@items/physical/weapon/index.mjs';
  import { provide } from 'vue';

  const props = defineProps<{
    context: any;
  }>();

  const store = useWeaponStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
