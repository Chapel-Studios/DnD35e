<script lang="ts" setup>
  import { NameArtWrapper, ItemHeader } from './components/index.mjs';
  import TabDivider from '@vc/TabDivider/TabDivider.vue';
  import { inject, provide } from 'vue';
  import { BaseItemSheetRenderContext, ItemSheetStore, useItemSheetStore } from './index.mjs';
  import ItemName from './components/ItemName.vue';

  const props = defineProps<{
    context?: BaseItemSheetRenderContext
  }>();

  const store = props.context
    ? useItemSheetStore(props.context)
    : inject('itemSheetStore');

  if (props.context) {
    provide('itemSheetStore', store);
  }

  const {
    documentGetters: {
      displayName,
    },
    tabs: {
      tabGetters: {
        tabs,
      },
    },
  } = store as ItemSheetStore;
</script>

<template>
  <ItemHeader>
    <NameArtWrapper>
      <slot name="header-name">
        <ItemName label-key="D35E.ItemName" :value="displayName" />
      </slot>
    </NameArtWrapper>

    <template name="header-status">
      <slot name="status"></slot>
    </template>
    <template name="summary">
      <slot name="header-summary"></slot>
    </template>
  </ItemHeader>
  <TabDivider />
  <div
    v-for="tab in tabs"
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
