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
  import DisableEffect from '@effects/BaseActiveEffect/sheet/components/DisableEffect.vue';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { provide } from 'vue';

  import { Material } from '../index.mjs';
  import { useMaterialStore } from './index.mjs';

  const props = defineProps<{
    context: VueApplicationContext<Material>;
  }>();

  const store = useMaterialStore(props.context);
  provide(DocumentSheetStoreSymbol, store);

</script>
