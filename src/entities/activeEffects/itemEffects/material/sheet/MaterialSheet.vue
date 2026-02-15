<template>
  <IdentifiableItemSheetVue />
</template>
<script lang="ts" setup>
  import { IdentifiableItemSheetVue } from '@ec/Identifiable/index.mjs';
  import { provide } from 'vue';
  import { type MaterialSheetRenderContext, useMaterialStore } from './index.mjs';

  const props = defineProps<{
    context: MaterialSheetRenderContext;
  }>();

  const store = useMaterialStore(props.context);
  provide('itemSheetStore', store);

</script>
