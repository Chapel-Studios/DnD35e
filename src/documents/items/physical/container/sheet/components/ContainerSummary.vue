<template>
  <div class="container-summary">
    <SelectFormGroup v-bind="containerTypeProps" class="container-type-select" />
    <div class="contents-summary">
      <span class="count">{{ contentsCount }} {{ localize('dnd35e.CONTAINER.ContentsCount') }}</span>
      <span
        :class="{'over-capacity': isOverCapacity}"
        class="weight"
      >{{ displayWeight }}</span>
      <span class="value">{{ contentsValue }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { type SettingsStore,SettingsStoreSymbol } from '@settings/index.mjs';
  import type { SelectFormGroupProps } from '@vc/fields/formGroups/types.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  import { type ContainerTypeOption,ContainerTypeSelectOptions } from '../../data/constants.mjs';
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

  const containerTypeProps: SelectFormGroupProps<ContainerTypeOption> = {
    fieldPath: 'system.containerType',
    options: [...ContainerTypeSelectOptions],
  };
</script>

<style scoped lang="scss">
  .container-summary {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    .form-group.select-form-group.container-type-select {
      grid-auto-flow: column;
      padding: 0;
      border: none;
    }

    .contents-summary {
      display: flex;
      align-items: center;
      justify-content: space-around;

      .over-capacity {
        color: var(--color-danger);
      }
    }
  }
</style>
