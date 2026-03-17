<template>
  <ColorFormGroup
    label="EFFECT.Tint"
    :value="tint"
    :on-update="getDirectFieldUpdater('tint')"
  />
</template>

<script setup lang="ts">
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import ColorFormGroup from '@vc/Fields/FormGroups/ColorFormGroup.vue';
  import { inject } from 'vue';
  
  const store = inject('documentSheetStore') as ActiveEffectConfigStore;
  const {
    documentGetters: {
      isDisabled,
      tint,
      statuses,
      showIcon,
      origin,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = store;
</script>

<style lang="scss" scoped>
</style>