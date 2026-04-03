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
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
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

    provide(DocumentSheetStoreSymbol, {
      ...baseStore,
      ...physicalItemStore,
    });
  }
</script>
