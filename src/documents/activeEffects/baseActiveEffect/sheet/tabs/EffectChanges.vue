<template>
  <section
    class="effect-changes"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="changes"
  >
    <EffectChangesList :show-bonus-type="showBonusType" />
  </section>
</template>

<script setup lang="ts">
  import type { RenderModeStore, TabStore } from '@documents/document/index.mjs';
  import { RenderModeStoreSymbol, TabStoreSymbol } from '@documents/document/index.mjs';
  import EffectChangesList from '@effects/baseActiveEffect/sheet/components/EffectChangesList.vue';
  import { inject } from 'vue';

  defineProps<{
    showBonusType?: boolean;
  }>();

  inject(RenderModeStoreSymbol) as RenderModeStore;
  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const isActiveTab = getIsTabOpen('changes');
</script>

<style scoped>
  .effect-changes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
