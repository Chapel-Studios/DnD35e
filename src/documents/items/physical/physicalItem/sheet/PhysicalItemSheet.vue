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
  import { provide } from 'vue';

  import { usePhysicalItemStore } from './PhysicalItemStore.mjs';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const physicalItemStore = usePhysicalItemStore(props.context);

    provide(DocumentSheetStoreSymbol, physicalItemStore);
  }
</script>
