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
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { EquippableHeaderStatus } from '@items/components/Equippable/index.mjs';
  import { PhysicalItemSheet } from '@items/components/Physical/index.mjs';
  import { useWeaponStore, WeaponSummary } from '@items/weapon/index.mjs';
  import { provide } from 'vue';

  const props = defineProps<{
    context: any;
  }>();

  const store = useWeaponStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
