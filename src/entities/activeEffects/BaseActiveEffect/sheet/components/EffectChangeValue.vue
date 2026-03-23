<template>
  <input
    type="text"
    :name="`system.changes.${index}.value`"
    :value="change.value.toString()"
    :placeholder="valuePlaceholder"
    :disabled="!isEditable || change.isSystem"
  />
</template>

<script setup lang="ts">
  import { ActiveEffectConfigStore, Dnd35eEffectChangeData } from '@effects/BaseActiveEffect/index.mjs';
  import { inject } from 'vue';
  
  defineProps<{
    change: Dnd35eEffectChangeData;
    index: number;
  }>();

  const {
    isEditable,
  } = inject('documentSheetStore') as ActiveEffectConfigStore;

  const valuePlaceholder = game.i18n.localize('EFFECT.ChangeValue');
</script>

<style lang="scss" scoped>
</style>
