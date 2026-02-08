<template>
  <BaseItemSheetVue>
    <template #header-name>
      <slot name="header-name">
        <IdentifiableItemName />
      </slot>
    </template>
    <template #header-status>
      <slot name="header-status">
      </slot>
    </template>
    <template #header-summary>
      <slot name="header-summary">
      </slot>
    </template>
  </BaseItemSheetVue>
</template>

<script lang="ts" setup>
  import { BaseItemSheetVue, useItemSheetStore } from '@items/baseItem/index.mjs';
  import { provide } from 'vue';
  import { IdentifiableItemName } from '@items/components/Identifiable/index.mjs';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const baseStore = useItemSheetStore(props.context);
    const physicalItemStore = useItemSheetStore(props.context);
    provide('itemSheetStore', {
      ...baseStore,
      ...physicalItemStore,
    });
  }
</script>
