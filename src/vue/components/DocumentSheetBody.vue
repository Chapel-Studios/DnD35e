<script lang="ts" setup>
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import TabDivider from '@vc/TabDivider/TabDivider.vue';
  import { inject } from 'vue';

  // Get tabs from props or fall back to injected store
  const store = inject('documentSheetStore') as ItemSheetStore | undefined;
  const tabList = store?.tabs.tabGetters.tabs;
</script>

<template>
  <slot name="header"></slot>
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

<style lang="scss">
  .sheet-tab {
    padding: 0.5rem 0.5rem 0 0;
    overflow: auto;
  }
</style>
