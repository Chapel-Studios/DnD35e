<template>
  <div
    :class="{
      'edit-mode': isEditViewMode,
      'view-mode': !isEditViewMode,
    }"
  >
    <DocumentHeader>
      <DocumentArt />
      <div class="doc-name-container">
        <slot name="header-name">
          <HeaderNameField />
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
  </div>
</template>

<script lang="ts" setup>
  import type {
    RenderModeStore,
    SheetMode,
    TabStore,
  } from '@ec/CoreMixin/index.mjs';
  import {
    DocumentArt,
    DocumentHeader,
    DocumentSheetStoreSymbol,
    HeaderNameField,
    RenderModeStoreSymbol,
    TabStoreSymbol,
  } from '@ec/CoreMixin/index.mjs';
  import { useActiveEffectConfigStore } from '@effects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import TabDivider from '@vc/TabDivider/TabDivider.vue';
  import { inject, provide } from 'vue';

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

  const { isEditViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const { tabs: tabList } = inject(TabStoreSymbol) as TabStore;
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
