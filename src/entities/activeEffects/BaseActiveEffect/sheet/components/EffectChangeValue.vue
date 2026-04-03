<template>
  <input
    type="text"
    :name="`system.changes.${index}.value`"
    :value="change.value.toString()"
    :placeholder="valuePlaceholder"
    :disabled="!isEditViewMode || change.isSystem"
  />
</template>

<script setup lang="ts">
  import { RenderModeStore, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
  import { inject } from 'vue';
  
  defineProps<{
    change: Dnd35eEffectChangeData;
    index: number;
  }>();

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const valuePlaceholder = game.i18n.localize('EFFECT.ChangeValue');
</script>

<style lang="scss" scoped>
</style>
