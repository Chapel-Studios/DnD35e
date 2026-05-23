<template>
  <IdentifiableDocumentSheetVue>
    <template v-if="$slots['header-name']" #header-name>
      <slot name="header-name" />
    </template>
    <template v-if="$slots['header-status']" #header-status>
      <slot name="header-status" />
    </template>
    <template v-if="$slots['header-summary']" #header-summary>
      <slot name="header-summary" />
    </template>
  </IdentifiableDocumentSheetVue>
</template>

<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { IdentifiableDocumentSheetVue } from '@documents/identifiable/index.mjs';
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import type { PhysicalItemLike, PhysicalItemStore } from '@items/physical/physicalItem/index.mjs';
  import { provide } from 'vue';

  import { usePhysicalItemStore } from './PhysicalItemStore.mjs';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const baseStore = useItemSheetStore(props.context) as ItemSheetStore<PhysicalItemLike>;
    const physicalItemStore = usePhysicalItemStore(props.context, baseStore) as PhysicalItemStore;

    provide(DocumentSheetStoreSymbol, {
      ...baseStore,
      ...physicalItemStore,
    });
  }
</script>
