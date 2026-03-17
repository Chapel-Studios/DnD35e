<template>
  <DocumentHeader>
    <ItemArt />
    <div class="doc-name-container">
      <slot name="header-name">
        <DefaultHeaderName />
      </slot>
    </div>

    <template #status>
      <slot name="header-status"></slot>
    </template>
    <template #summary>
      <slot name="header-summary"></slot>
    </template>
  </DocumentHeader>
  <TabDivider />
  <div
    v-for="tab in tabList"
    :key="tab.id"
    class="sheet-tab"
  >
    <component :is="tab.component" />
  </div>
  <slot name="footer"></slot>
</template>

<script lang="ts" setup>
  import {
    DefaultHeaderName,
    DocumentHeader,
    ItemArt,
    SheetMode,
  } from '@ec/CoreMixin/index.mjs';
  import { ActiveEffectConfigStore, useActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { type ItemSheetStore,useItemSheetStore } from '@items/baseItem/index.mjs';
  import TabDivider from '@vc/TabDivider/TabDivider.vue';
  import { inject, provide } from 'vue';

  const props = withDefaults(defineProps<{
    context?: any;
    mode?: SheetMode;
  }>(), {
    mode: 'item',
  });

  let store: ItemSheetStore | ActiveEffectConfigStore | undefined;

  if (props.context) {
    const store = props.mode === 'effect'
      ? useActiveEffectConfigStore(props.context)
      : useItemSheetStore(props.context);

    provide('documentSheetStore', store);
  }
  else{
    store = inject('documentSheetStore');
  }

  const tabList = store?.tabs.tabGetters.tabs;
</script>

<style lang="scss">
  .sheet-tab {
    padding: 0.5rem 0.5rem 0 0;
    overflow: auto;
  }

  .name-and-art {
    display: flex;
  }

  .doc-name-container {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 1rem;
  }
</style>
