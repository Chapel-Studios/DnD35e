<template>
  <DocumentSheetBody>
    <template #header-summary>
      <SelectFormGroup
        :options="materialSubtypeSelectOptions"
        field-path="system.materialSubtype"
        class="material-subtype"
      >
        <template #readonly>
          <span>{{ materialDisplayValue }}</span>
        </template>
      </SelectFormGroup>
      <DisableEffect />
    </template>
  </DocumentSheetBody>
</template>
<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { DocumentSheetBody } from '@documents/document/index.mjs';
  import DisableEffect from '@effects/baseActiveEffect/sheet/components/DisableEffect.vue';
  import { MATERIAL_SUBTYPE_STANDARD, materialSubtypeSelectOptions } from '@effects/material/data/index.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { computed, provide } from 'vue';

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
  } = store;
  const materialDisplayValue = computed(() => {
    const materialSubtypeSelection = materialSubtypeSelectOptions
      .find(option => option.value === materialSubtype.value);
    if (materialSubtypeSelection === undefined) return null;
    const isStandard = materialSubtypeSelection?.value === MATERIAL_SUBTYPE_STANDARD;
    return isStandard ? ' ' : game.i18n.localize(materialSubtypeSelection.label);
  });
</script>

<style lang="scss" scoped>
  .material-subtype {
    border: none;
  }
  :global(.view-mode .material-subtype .form-group-label) {
    display: none;
  }
</style>