<template>
  <PhysicalItemSheet>
    <template #header-summary>
      <WeaponSummary />
    </template>
    <template #header-status>
      <!-- EquipableHeaderStatus
        is carried and is equipped status indicators will go here after character inventory POC is complete
       -->
    </template>
  </PhysicalItemSheet>
</template>

<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { PhysicalItemSheet } from '@items/components/Physical/index.mjs';
  import { useWeaponStore, WeaponSummary } from '@items/weapon/index.mjs';
  import { provide } from 'vue';

  const props = defineProps<{
    context: any;
  }>();

  const store = useWeaponStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
