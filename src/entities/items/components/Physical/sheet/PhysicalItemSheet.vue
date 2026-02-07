<template>
  <IdentifiableItemSheetVue>
    <template #header-name>
      <slot name="header-name">
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
  </IdentifiableItemSheetVue>
</template>

<script lang="ts" setup>
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import { provide } from 'vue';
  import { IdentifiableItemSheetVue } from '@items/components/Identifiable/index.mjs';
  import { usePhysicalItemStore } from './PhysicalItemStore.mjs';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const baseStore = useItemSheetStore(props.context);
    const physicalItemStore = usePhysicalItemStore(props.context, baseStore);

    provide('itemSheetStore', {
      ...baseStore,
      ...physicalItemStore,
    });
  }
</script>
