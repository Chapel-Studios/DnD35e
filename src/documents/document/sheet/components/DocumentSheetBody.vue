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
      <div ref="tabPanesEl" class="sheet-tab-panes">
        <div
          v-for="tab in tabList"
          :key="tab.id"
          v-show="tab.id === activeTabId"
          class="sheet-tab-container"
        >
          <component :is="tab.component" class="sheet-tab" />
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
  import {
    inject,
    nextTick,
    provide,
    ref,
    watch,
  } from 'vue';

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
  const tabPanesEl = ref<HTMLDivElement | null>(null);
  const tabScrollPositions = new Map<string, number>();

  watch(activeTabId, async (newTabId, oldTabId) => {
    const tabPanes = tabPanesEl.value;
    if (!tabPanes) return;

    if (oldTabId) {
      tabScrollPositions.set(oldTabId, tabPanes.scrollTop);
    }

    await nextTick();
    const nextTabPanes = tabPanesEl.value;
    if (!nextTabPanes) return;

    const savedScrollTop = tabScrollPositions.get(newTabId) ?? 0;
    nextTabPanes.scrollTo({ top: savedScrollTop, behavior: 'auto' });
  });
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
    overflow: hidden;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0; // Ensure the content can shrink properly when vertical tabs are enabled

    .sheet-tab-panes {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
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

  .sheet-tab-container {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    padding: 0.5rem;
    overflow: visible;
    width: 100%;
  }

  .sheet-tab {
    width: 100%;
    min-width: 0;
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
    flex: 0 0 auto;
    width: fit-content;
    padding: 0.5rem;
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
  }
</style>
