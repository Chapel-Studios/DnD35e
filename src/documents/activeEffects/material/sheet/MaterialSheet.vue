<template>
  <DocumentSheetBody>
    <template #header-summary>
      <SelectFormGroup
        :value="materialSubtype"
        :options="materialSubtypeSelectOptions"
        :on-update="materialSubtypeUpdater"
        field-path="system.materialSubtype"
      />
      <DisableEffect />
    </template>
  </DocumentSheetBody>
</template>
<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { DocumentSheetBody } from '@documents/document/index.mjs';
  import DisableEffect from '@effects/baseActiveEffect/sheet/components/DisableEffect.vue';
  import { materialSubtypeSelectOptions } from '@effects/material/data/index.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { provide } from 'vue';

  import { Material } from '../index.mjs';
  import { type MaterialStore,useMaterialStore } from './index.mjs';

  const props = defineProps<{
    context: VueApplicationContext<Material>;
  }>();

  const store: MaterialStore = useMaterialStore(props.context);
  provide(DocumentSheetStoreSymbol, store);

  const {
    documentGetters: {
      materialSubtype,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = store;

  const materialSubtypeUpdater = getViewAwareFieldUpdater('system.materialSubtype');

</script>
