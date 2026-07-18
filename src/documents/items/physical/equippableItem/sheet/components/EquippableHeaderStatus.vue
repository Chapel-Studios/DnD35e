<template>
  <PhysicalItemHeaderStatus
    :icon-override="equippedIcon"
    :label-override="statusLabel"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EquippableItemStore } from '@items/physical/equippableItem/index.mjs';
  import PhysicalItemHeaderStatus from '@items/physical/physicalItem/sheet/components/PhysicalItemHeaderStatus.vue';
  import { computed, inject } from 'vue';

  const store = inject(DocumentSheetStoreSymbol) as EquippableItemStore;

  const { isEquipped } = store.documentGetters;
  const equippedIcon = computed(() => isEquipped.value
    ? 'fas fa-shield-alt'
    : undefined);
  const statusLabel = computed(() => isEquipped.value
    ? game.i18n.localize('dnd35e.EQUIPPABLE.FIELDS.isEquipped.label')
    : undefined);
</script>

<style scoped lang="scss">
</style>
