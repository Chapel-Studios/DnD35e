<template>
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
</template>

<script lang="ts" setup>
  import type { TabStore } from '@ec/CoreMixin/index.mjs';
  import { TabStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  const {
    tabs,
    activeTabId,
    activateTab,
  } = inject(TabStoreSymbol) as TabStore;

  const { verticalTabs } = defineProps<{
    verticalTabs?: boolean;
  }>();
  
  const localize = (key: string) => game.i18n.localize(key);

  const navDescription = localize('SHEETS.FormNavLabel');
  const navClass = computed(() => {
    return {
      'sheet-tabs': true,
      tabs: true,
      vertical: verticalTabs,
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
</style>
