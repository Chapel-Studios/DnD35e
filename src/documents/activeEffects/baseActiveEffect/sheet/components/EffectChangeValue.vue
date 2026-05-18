<template>
  <input
    type="text"
    :name="`system.changes.${index}.value`"
    :value="String(change.value ?? '')"
    :placeholder="valuePlaceholder"
    :disabled="!isEditMode || change.isSystem"
  />
</template>

<script setup lang="ts">
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
  import { inject } from 'vue';
  
  defineProps<{
    change: EffectChangeDataDnd35e;
    index: number;
  }>();

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const valuePlaceholder = game.i18n.localize('EFFECT.ChangeValue');
</script>

<style lang="scss" scoped>
</style>
