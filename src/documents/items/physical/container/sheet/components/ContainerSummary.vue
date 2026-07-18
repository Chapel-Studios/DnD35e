<template>
  <div class="container-summary">
    <span class="count">{{ contentsCount }} {{ localize('dnd35e.CONTAINER.ContentsCount') }}</span>
    <span
      :class="{'over-capacity': isOverCapacity}"
      class="weight"
    >{{ displayWeight }}</span>
    <span class="value">{{ contentsValue }}</span>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { type SettingsStore,SettingsStoreSymbol } from '@settings/index.mjs';
  import { computed, inject } from 'vue';

  import type { ContainerStore } from '../ContainerStore.mjs';

  const localize = (key: string) => game.i18n.localize(key);

  const {
    documentGetters: {
      contentsCount,
      contentsWeight,
      isOverCapacity,
      contentsValue,
    },
  } = inject(DocumentSheetStoreSymbol) as ContainerStore;

  const {
    measurement: {
      convertToLocalizedWeight,
      weightDisplayShortLabel,
    },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const displayWeight = computed(() => {
    const weight = convertToLocalizedWeight(contentsWeight.value);
    return `${weight} ${weightDisplayShortLabel.value}`;
  });
</script>

<style scoped lang="scss">
  .container-summary {
    display: flex;
    align-items: center;
    justify-content: space-around;
    
    .over-capacity {
      color: var(--color-danger);
    }
  }
</style>
