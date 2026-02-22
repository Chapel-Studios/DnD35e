<template>
  <IdentifiableDocumentSheetVue>
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
  </IdentifiableDocumentSheetVue>
</template>

<script lang="ts" setup>
  import { IdentifiableDocumentSheetVue } from '@ec/Identifiable/index.mjs';
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import type { PhysicalItemLike, PhysicalItemStore } from '@items/components/Physical/index.mjs';
  import { usePhysicalItemStore } from '@items/components/Physical/index.mjs';
  import { provide } from 'vue';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const baseStore = useItemSheetStore(props.context) as ItemSheetStore<PhysicalItemLike>;
    const physicalItemStore = usePhysicalItemStore(props.context, baseStore) as PhysicalItemStore;

    provide('documentSheetStore', {
      ...baseStore,
      ...physicalItemStore,
    });
  }
</script>
