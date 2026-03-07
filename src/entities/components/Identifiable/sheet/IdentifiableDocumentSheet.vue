<template>
  <component :is="baseComponent">
    <template #header-name>
      <slot name="header-name">
        <IdentifiableDefaultHeaderName />
      </slot>
    </template>
    <template v-if="$slots['header-status']" #status>
      <slot name="header-status" />
    </template>
    <template v-if="$slots['header-summary']" #header-summary>
      <slot name="header-summary" />
    </template>
  </component>
</template>

<script lang="ts" setup>
  import { IdentifiableDefaultHeaderName } from '@ec/Identifiable/index.mjs';
  import { ActiveEffectConfigVue, useActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { BaseItemSheetVue, useItemSheetStore } from '@items/baseItem/index.mjs';
  import { computed, provide } from 'vue';

  type SheetMode = 'item' | 'effect';

  const props = withDefaults(defineProps<{
    context?: any;
    mode?: SheetMode;
  }>(), {
    mode: 'item',
  });

  const baseComponent = computed(() => props.mode === 'effect' ? ActiveEffectConfigVue : BaseItemSheetVue);

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
