<template>
  <ColorFormGroup
    label="EFFECT.Tint"
    :value="tintString"
    :on-update="getViewAwareFieldUpdater('tint')"
    field-path="tint"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import ColorFormGroup from '@vc/Fields/FormGroups/ColorFormGroup.vue';
  import { inject } from 'vue';
  
  const store = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
  const {
    documentGetters: {
      tint,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = store;

  const tintString = tint.value?.toString() || '';
</script>

<style lang="scss" scoped>
</style>
