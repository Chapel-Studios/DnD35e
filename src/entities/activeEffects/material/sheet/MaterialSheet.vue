<template>
  <IdentifiableDocumentSheetVue mode="effect">
    <template #header-summary>
      <DisableEffect />
    </template>
  </IdentifiableDocumentSheetVue>
</template>
<script lang="ts" setup>
  import { IdentifiableDocumentSheetVue } from '@ec/Identifiable/index.mjs';
  import DisableEffect from '@effects/BaseActiveEffect/sheet/components/DisableEffect.vue';
  import { provide } from 'vue';

  import type { MaterialSheetRenderContext } from './index.mjs';
  import { useMaterialStore } from './index.mjs';

  const props = defineProps<{
    context: MaterialSheetRenderContext;
  }>();

  const store = useMaterialStore(props.context);
  provide('documentSheetStore', store);

</script>
