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
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import { usePhysicalItemStore } from '@items/components/Physical/index.mjs';
  import PhysicalItemSheet from '@items/components/Physical/sheet/PhysicalItemSheet.vue';
  import { provide } from 'vue';

  import { EquippableItemLike } from '../EquippableItem.mjs';
  import { EquippableItemStore } from './EquippableItemStore.mjs';

  const props = defineProps<{
    context?: any;
  }>();

  if (props.context) {
    const baseStore = useItemSheetStore(props.context) as ItemSheetStore<EquippableItemLike>;
    const equippableItemStore = usePhysicalItemStore(props.context, baseStore) as EquippableItemStore;

    provide('documentSheetStore', {
      ...baseStore,
      ...equippableItemStore,
    });
  }
</script>
