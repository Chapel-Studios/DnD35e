<template>
  <PhysicalItemSheet>
    <template v-if="$slots['header-name']" #header-name>
      <slot name="header-name" />
    </template>
    <template v-if="$slots['header-status']" #header-status>
      <slot name="header-status" />
    </template>
    <template v-if="$slots['header-summary']" #header-summary>
      <slot name="header-summary" />
    </template>
  </PhysicalItemSheet>
</template>

<script lang="ts" setup>
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import PhysicalItemSheet from '@items/physical/physicalItem/sheet/PhysicalItemSheet.vue';
  import { provide } from 'vue';

  import { useEquippableItemStore } from './EquippableItemStore.mjs';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const equippableItemStore = useEquippableItemStore(props.context);

    provide(DocumentSheetStoreSymbol, equippableItemStore);
  }
</script>
