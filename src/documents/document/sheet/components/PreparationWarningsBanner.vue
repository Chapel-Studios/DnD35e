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
      @click="dismiss"
    >
      <i class="fas fa-xmark"></i>
    </button>
  </div>
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import { dismissPreparationWarnings, isPreparationWarningsDismissed } from './preparationWarningsDismissal.mjs';

  const localize = (key: string): string => game.i18n.localize(key);

  const { documentGetters } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const warnings = documentGetters.preparationWarnings;
  const documentUuid = documentGetters.documentUuid;

  // Dismissable per-document for the browser session (see preparationWarningsDismissal.mts) -
  // a signature check still surfaces the banner if the actual warning set changes.
  const dismissed = computed(() => isPreparationWarningsDismissed(documentUuid.value, warnings.value));
  const dismiss = () => dismissPreparationWarnings(documentUuid.value, warnings.value);

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
