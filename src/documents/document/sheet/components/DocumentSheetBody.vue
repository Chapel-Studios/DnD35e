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
      position: relative;
      flex-direction: row;

      /* Move the tab nav to the right side */
      .sheet-tabs {
        position: absolute;
        height: auto;
        left: calc(100% + var(--spacer-16));
        display: flex;
        flex-direction: column;
        padding: 0.25rem 0;
        border-left: 1px solid var(--color-border);
        border-right: 1px solid var(--color-border);
        background: var(--background, rgba(11, 10, 19, 0.9));
        box-shadow: 11px 0 10px -4px #000;

        &::before {
          content: '';
          position: absolute;
          top: -1rem;
          width: 2.5rem;
          height: 2.5rem;
          border-top: 1px solid var(--color-border);
          border-left: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          background: var(--background, rgba(11, 10, 19, 0.9));
          border-radius: 0 50% 0 0;
          z-index: -1;
          box-shadow: 1px 0px 8px 5px #000;
        }

        &::after {
          content: '';
          position: absolute;
          bottom: -1rem;
          width: 2.5rem;
          height: 2.5rem;
          border-bottom: 1px solid var(--color-border);
          border-left: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          background: var(--background, rgba(11, 10, 19, 0.9));
          border-radius: 0 0 50% 0;
          z-index: -1;
          box-shadow: 4px 4px 8px 0px #000;
        }

        /* Hide text labels — icon only */
        a span {
          display: none;
        }

        a {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 2.5rem;
          height: 2.5rem;
          color: var(--color-text-dark-secondary, #666);
          opacity: 0.6;
          border-radius: 3px;
          transition: opacity 0.15s, background 0.15s;
          font-size: 0.9rem;

          &:hover {
            opacity: 1;
            background: var(--background, rgba(0, 0, 0, 0.06));
          }

          &.active {
            opacity: 1;
            color: var(--color-text-hyperlink, #c00);
            background: var(--color-bg-option, rgba(0, 0, 0, 0.06));
          }
        }
      }

      .sheet-tab-panes {
        order: 1;
        flex: 1 1 auto;
      }
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

  .actor-sheet .doc-name-container {
    grid-column: span 2;
  }
</style>
