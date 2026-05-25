<template>
  <div
    class="document-sheet-body"
    :class="{
      'edit-mode': isEditMode,
      'view-mode': !isEditMode,
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
    <div class="sheet-body-content" :class="{ 'vertical-tabs': verticalTabs }">
      <TabDivider :vertical-tabs="verticalTabs" />
      <div class="sheet-tab-panes">
        <div
          v-for="tab in tabList"
          :key="tab.id"
          v-show="tab.id === activeTabId"
          class="sheet-tab"
        >
          <component :is="tab.component" />
        </div>
      </div>
    </div>
    <slot name="footer"></slot>
  </div>
</template>

<script lang="ts" setup>
  import type {
    RenderModeStore,
    SheetMode,
    TabStore,
  } from '@documents/document/index.mjs';
  import {
    DocumentArt,
    DocumentHeader,
    DocumentSheetStoreSymbol,
    HeaderNameField,
    RenderModeStoreSymbol,
    TabStoreSymbol,
  } from '@documents/document/index.mjs';
  import { useActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
  import { useItemSheetStore } from '@items/baseItem/index.mjs';
  import TabDivider from '@vc/TabDivider/TabDivider.vue';
  import { inject, provide } from 'vue';

  const props = withDefaults(defineProps<{
    context?: any;
    mode?: SheetMode;
    verticalTabs?: boolean;
  }>(), {
    mode: 'item',
    verticalTabs: false,
  });

  if (props.context) {
    const store = props.mode === 'effect'
      ? useActiveEffectConfigStore(props.context)
      : useItemSheetStore(props.context);

    provide(DocumentSheetStoreSymbol, store);
  }

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const { activeTabId, tabs: tabList } = inject(TabStoreSymbol) as TabStore;
</script>

<style lang="scss">
  .document-sheet-body {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    height: 100%;
  }

  .sheet-body-content {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;

    &.vertical-tabs {
      flex-direction: row;
    }
  }

  .sheet-tab-panes {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    position: relative;
  }

  .sheet-tab {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    padding: 0.5rem 0.5rem 0 0;
    overflow: visible;
  }

  .sheet-tab > * {
    flex: 1 1 auto;
    min-height: 0;
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
