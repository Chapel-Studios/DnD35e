<template>
  <PhysicalItemSheet>
    <template #header-summary>
      <ContainerSummary />
    </template>
    <template #header-status>
      <PhysicalItemHeaderStatus />
    </template>
  </PhysicalItemSheet>
</template>

<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { PhysicalItemHeaderStatus, PhysicalItemSheet } from '@items/physical/physicalItem/sheet/index.mjs';
  import { provide } from 'vue';

  import ContainerSummary from './components/ContainerSummary.vue';
  import { useContainerStore } from './ContainerStore.mjs';

  const props = defineProps<{
    context: any;
  }>();

  const store = useContainerStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
