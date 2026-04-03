<template>
  <DocumentSheetBody>
    <template #header-name>
      <slot v-if="slots.headerName" name="header-name">
        <!-- <IdentifiableDefaultHeaderName /> -->
      </slot>
    </template>
    <template #header-status>
      <IsIdentifiedToggle />
      <slot name="header-status" />
    </template>
    <template v-if="slots.headerSummary" #header-summary>
      <slot name="header-summary" />
    </template>
  </DocumentSheetBody>
</template>

<script lang="ts" setup>
  import type { SheetMode } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetBody, DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { IdentifiableDefaultHeaderName, IsIdentifiedToggle } from '@ec/Identifiable/index.mjs';
  import { useActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
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
