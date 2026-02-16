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
  import { IdentifiableItemSheetVue } from '@ec/Identifiable/index.mjs';
  import { PhysicalItemSheetStore, usePhysicalItemStore } from './PhysicalItemStore.mjs';
  import { PhysicalItemLike } from '../PhysicalItemDnd35e.mjs';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const baseStore = useItemSheetStore<PhysicalItemLike>(props.context);
    const physicalItemStore = usePhysicalItemStore(props.context, baseStore) as PhysicalItemSheetStore;

    provide('itemSheetStore', {
      ...baseStore,
      ...physicalItemStore,
    });
  }
</script>
