<template>
  <DocumentSheetBody>
    <template #header-summary>
      <DisableEffect />
    </template>
  </DocumentSheetBody>
</template>
<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetBody } from '@ec/CoreMixin/index.mjs';
  import DisableEffect from '@effects/BaseActiveEffect/sheet/components/DisableEffect.vue';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { provide } from 'vue';

  import type { Secret } from '../Secret.mjs';
  import { useSecretStore } from './SecretStore.mjs';

  const props = defineProps<{
    context: VueApplicationContext<Secret>;
  }>();

  const store = useSecretStore(props.context);
  provide(DocumentSheetStoreSymbol, store);
</script>
