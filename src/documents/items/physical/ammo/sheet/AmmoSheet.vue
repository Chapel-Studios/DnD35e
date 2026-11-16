<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { PhysicalItemSheet } from '@items/physical/physicalItem/index.mjs';
  import { provide } from 'vue';

  import { useAmmoStore } from './AmmoStore.mjs';

  const props = defineProps<{
    context: any;
  }>();

  const store = useAmmoStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>

<template>
  <PhysicalItemSheet>
    
  </PhysicalItemSheet>
</template>
