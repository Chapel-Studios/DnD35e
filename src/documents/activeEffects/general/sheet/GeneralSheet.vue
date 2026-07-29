<template>
  <DocumentSheetBody>
    <template #header-summary>
      <DisableEffect />
    </template>
  </DocumentSheetBody>
</template>
<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { DocumentSheetBody } from '@documents/document/index.mjs';
  import DisableEffect from '@effects/baseActiveEffect/sheet/components/DisableEffect.vue';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { provide } from 'vue';

  import type { General } from '../General.mjs';
  import { useGeneralStore } from './GeneralStore.mjs';

  const props = defineProps<{
    context: VueApplicationContext<General>;
  }>();

  const store = useGeneralStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
