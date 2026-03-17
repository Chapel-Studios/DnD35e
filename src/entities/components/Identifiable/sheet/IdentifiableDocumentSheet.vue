<template>
  <DocumentSheetBody>
    <template #header-name>
      <slot name="header-name">
        <IdentifiableDefaultHeaderName />
      </slot>
    </template>
    <template #header-status>
      <IsIdentifiedToggle />
      <slot name="header-status" />
    </template>
    <template v-if="$slots['header-summary']" #header-summary>
      <slot name="header-summary" />
    </template>
  </DocumentSheetBody>
</template>

<script lang="ts" setup>
  import type { SheetMode } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetBody } from '@ec/CoreMixin/index.mjs';
  import { IdentifiableDefaultHeaderName, IsIdentifiedToggle } from '@ec/Identifiable/index.mjs';
  import { useActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import { provide } from 'vue';

  const props = withDefaults(defineProps<{
    context?: any;
    mode?: SheetMode;
  }>(), {
    mode: 'item',
  });

  if (props.context) {
    if (props.mode === 'effect') {
      const store = useActiveEffectConfigStore(props.context);
      provide('documentSheetStore', store);
    } else {
      const store = useItemSheetStore(props.context);
      provide('documentSheetStore', store);
    }
  }
</script>
