<template>
  <IdentifiableDocumentSheetVue mode="effect">
    <template #header-summary>
      <DisableEffect />
    </template>
  </IdentifiableDocumentSheetVue>
</template>
<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { IdentifiableDocumentSheetVue } from '@ec/Identifiable/index.mjs';
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
