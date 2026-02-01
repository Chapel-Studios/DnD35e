<template>
  <IdentifiableItemSheetVue />
</template>
<script lang="ts" setup>
  import { IdentifiableItemSheetVue } from '@items/components/Identifiable/index.mjs';
  import { provide } from 'vue';
  import { type MaterialSheetRenderContext, useMaterialStore } from './index.mjs';
import { BaseItemSheetVue } from '@items/baseItem/index.mjs';

  const props = defineProps<{
    context: MaterialSheetRenderContext;
  }>();

  const store = useMaterialStore(props.context);
  provide('itemSheetStore', store);

</script>
