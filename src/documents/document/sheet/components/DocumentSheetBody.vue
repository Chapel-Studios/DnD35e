<template>
  <div
    class="document-sheet-body"
    :class="{
      'edit-mode': isEditMode,
      'view-mode': !isEditMode,
    }"
  >
    <DocumentHeader :show-status-area="showStatusArea">
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
    <TabDivider :vertical-tabs="verticalTabs" />
    <div class="sheet-body-content" :class="{ 'vertical-tabs': verticalTabs }">
      <div v-if="$slots.sidebar" class="sheet-sidebar">
        <slot name="sidebar"></slot>
      </div>
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
    showStatusArea?: boolean;
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

<style lang="scss" scoped>
  .document-sheet-body {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    height: 100%;
  }

  .sheet-body-content {
    display: flex;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 0; // Ensure the content can shrink properly when vertical tabs are enabled

    .sheet-tab-panes {
      flex: 1 1 auto;
      min-height: 0;
    }

    &.vertical-tabs {
      position: relative;
      flex-direction: row;

      .sheet-tab-panes {
        order: 1;
        position: relative;
      }
    }
  }

  .sheet-tab {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    padding: 0.5rem;
    overflow: visible;
  }

  .doc-name-container {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 1rem;
  }

  :global(.actor-sheet .doc-name-container) {
    grid-column: span 2;
  }

  .sheet-sidebar {
    width: fit-content;
    padding: 0.5rem;
  }
</style>
