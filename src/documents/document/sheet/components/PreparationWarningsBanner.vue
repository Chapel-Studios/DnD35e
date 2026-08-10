<template>
  <div
    v-if="!dismissed && warnings.length > 0"
    class="preparation-warnings-banner"
  >
    <i class="fas fa-triangle-exclamation"></i>
    <span class="preparation-warnings-banner-summary">
      {{ warningSummary }}
    </span>
    <button
      type="button"
      class="field-control-btn preparation-warnings-banner-dismiss"
      :aria-label="localize('dnd35e.COMMON.Dismiss')"
      @click="dismissed = true"
    >
      <i class="fas fa-xmark"></i>
    </button>
  </div>
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, ref } from 'vue';

  const localize = (key: string): string => game.i18n.localize(key);

  // Dismissable for now (per design) - resets whenever this component remounts,
  // i.e. every sheet render, so a fresh set of warnings is never silently hidden.
  const dismissed = ref(false);

  const { documentGetters } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const warnings = documentGetters.preparationWarnings;
  const warningSummary = computed(() => game.i18n.format('dnd35e.COMMON.PreparationWarningsSummary', { count: warnings.value.length }));
</script>

<style lang="scss" scoped>
  .preparation-warnings-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    background: var(--dnd35e-color-warning-bg, rgba(219, 166, 33, 0.15));
    border-bottom: 1px solid var(--dnd35e-color-warning, #c9902a);
    color: var(--dnd35e-color-warning, #c9902a);
    font-size: 0.85rem;

    i.fa-triangle-exclamation {
      flex: 0 0 auto;
    }

    .preparation-warnings-banner-summary {
      flex: 1 1 auto;
    }

    .preparation-warnings-banner-dismiss {
      flex: 0 0 auto;
    }
  }
</style>
