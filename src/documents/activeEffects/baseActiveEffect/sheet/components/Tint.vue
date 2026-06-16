<template>
  <ColorFormGroup
    label="EFFECT.FIELDS.Tint"
    :value="tintString"
    :on-update="getViewAwareFieldUpdater('tint')"
    field-path="tint"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { ActiveEffectConfigStore } from '@effects/baseActiveEffect/index.mjs';
  import ColorFormGroup from '@vc/fields/formGroups/ColorFormGroup.vue';
  import { computed, inject } from 'vue';
  
  const store = inject(DocumentSheetStoreSymbol) as ActiveEffectConfigStore;
  const {
    documentGetters: {
      tint,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
  } = store;

  const tintString = computed(() => tint.value?.toString() || '');
</script>

<style lang="scss" scoped>
</style>
