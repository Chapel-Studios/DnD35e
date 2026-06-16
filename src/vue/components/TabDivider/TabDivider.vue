<template>
  <Teleport v-if="verticalTabs && verticalTabHost" :to="verticalTabHost">
    <nav
      :class="navClass"
      :aria-roledescription="navDescription"
    >
      <a v-for="tab in tabs"
         :key="tab.id"
         :data-tab="tab.id"
         :data-tooltip="tab.tooltip"
         :aria-selected="tab.id === activeTabId ? 'true' : 'false'"
         :class="tab.id === activeTabId ? 'active' : ''"
         @click.prevent="onTabClick"
      >
        <i v-if="tab.icon" :class="tab.icon" inert></i>
        <span v-if="tab.label">{{ localize(tab.label) }}</span>
      </a>
    </nav>
  </Teleport>
  <nav
    v-else
    :class="navClass"
    :aria-roledescription="navDescription"
  >
    <a v-for="tab in tabs"
       :key="tab.id"
       :data-tab="tab.id"
       :data-tooltip="tab.tooltip"
       :aria-selected="tab.id === activeTabId ? 'true' : 'false'"
       :class="tab.id === activeTabId ? 'active' : ''"
       @click.prevent="onTabClick"
    >
      <i v-if="tab.icon" :class="tab.icon" inert></i>
      <span v-if="tab.label">{{ localize(tab.label) }}</span>
    </a>
  </nav>
</template>

<script lang="ts" setup>
  import type { TabStore } from '@documents/document/index.mjs';
  import { TabStoreSymbol } from '@documents/document/index.mjs';
  import type { DocumentSheetChrome } from '@vueApps/DocumentSheetChrome.mjs';
  import { DocumentSheetChromeSymbol } from '@vueApps/DocumentSheetChrome.mjs';
  import { computed, inject } from 'vue';

  const {
    tabs,
    activeTabId,
    activateTab,
  } = inject(TabStoreSymbol) as TabStore;

  const { verticalTabs } = defineProps<{
    verticalTabs?: boolean;
  }>();

  const chrome = inject(DocumentSheetChromeSymbol, null) as DocumentSheetChrome | null;
  const verticalTabHost = chrome?.verticalTabHost;
  
  const localize = (key: string) => game.i18n.localize(key);

  const navDescription = localize('SHEETS.FormNavLabel');
  const navClass = computed(() => {
    return {
      'sheet-tabs': true,
      tabs: true,
      vertical: verticalTabs,
      hosted: !!verticalTabs && !!verticalTabHost?.value,
    };
  });

  function onTabClick (event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const tabId = target.dataset.tab;
    if (tabId) {
      activateTab(tabId);
    }
  }
</script>

<style lang="scss" scoped>
  .sheet-tabs {
    margin-bottom: 0.5rem;

    &.vertical {
      position: absolute;
      height: auto;
      left: 100%;
      top: 5rem;
      display: flex;
      flex-direction: column;
      padding: 0.25rem 0;
      border-left: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
      background: var(--background, rgba(11, 10, 19, 0.9));
      box-shadow: 11px 0 10px -4px #000;
      margin-bottom: 0;

      &.hosted {
        position: relative;
        left: auto;
        top: auto;
      }

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
  }
</style>
