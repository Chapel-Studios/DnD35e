<template>
  <PhysicalItemSheet>
    <template #header-summary>
      <ArmorSummary />
    </template>
    <template #header-status>
      <!-- EquipableHeaderStatus
        is carried and is equipped status indicators will go here after character inventory POC is complete
       -->
    </template>
  </PhysicalItemSheet>
</template>

<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { ArmorSummary, useArmorStore } from '@items/physical/armor/index.mjs';
  import { PhysicalItemSheet } from '@items/physical/physicalItem/index.mjs';
  import { provide } from 'vue';

  const props = defineProps<{
    context: any;
  }>();

  const store = useArmorStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
