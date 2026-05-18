<template>
  <DocumentSheetBody>
    <template #header-name>
      <slot v-if="slots['header-name']" name="header-name">
      </slot>
    </template>
    <template #header-status>
      <IsIdentifiedToggle />
      <slot name="header-status" />
    </template>
    <template v-if="slots['header-summary']" #header-summary>
      <slot name="header-summary" />
    </template>
  </DocumentSheetBody>
</template>

<script lang="ts" setup>
  import type { SheetMode } from '@documents/document/index.mjs';
  import { DocumentSheetBody, DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { IsIdentifiedToggle } from '@documents/identifiable/index.mjs';
  import { useActiveEffectConfigStore } from '@effects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import { provide, useSlots } from 'vue';

  const slots = useSlots();

  const props = withDefaults(defineProps<{
    context?: any;
    mode?: SheetMode;
  }>(), {
    mode: 'item',
  });

  if (props.context) {
    const store = props.mode === 'effect'
      ? useActiveEffectConfigStore(props.context)
      : useItemSheetStore(props.context);
    provide(DocumentSheetStoreSymbol, store);
  }
</script>
