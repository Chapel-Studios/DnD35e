<template>
  <IdentifiableDocumentSheetVue mode="effect" />
</template>
<script lang="ts" setup>
  import { IdentifiableDocumentSheetVue } from '@ec/Identifiable/index.mjs';
  import { provide } from 'vue';

  import type { MaterialSheetRenderContext } from './index.mjs';
  import { useMaterialStore } from './index.mjs';

  const props = defineProps<{
    context: MaterialSheetRenderContext;
  }>();

  const store = useMaterialStore(props.context);
  provide('documentSheetStore', store);

</script>
