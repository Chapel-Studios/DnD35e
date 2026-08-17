<template>
  <div class="preparation-warnings-tab">
    <p class="preparation-warnings-tab-intro">
      {{ warningSummary }}
    </p>
    <ul class="preparation-warnings-list">
      <li v-for="(warning, index) in warnings" :key="`${warning.sourceUuid}:${warning.field}`" class="preparation-warning-row" :class="warning.severity">
        <i :class="warning.severity === 'error' ? 'fas fa-circle-exclamation' : 'fas fa-triangle-exclamation'"></i>
        <div class="preparation-warning-body">
          <span class="preparation-warning-source">{{ warning.sourcePath.join(' → ') }}</span>
          <span class="preparation-warning-field">{{ warning.field }}</span>
          <span class="preparation-warning-message">{{ warning.message }}</span>
          <span class="preparation-warning-uuid">{{ warning.sourceUuid }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  const { documentGetters } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const warnings = documentGetters.preparationWarnings;
  const warningSummary = computed(() => game.i18n.format('dnd35e.COMMON.PreparationWarningsSummary', { count: warnings.value.length }));
</script>

<style lang="scss" scoped>
  .preparation-warnings-tab-intro {
    color: var(--dnd35e-color-warning, #c9902a);
  }

  .preparation-warnings-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preparation-warning-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--dnd35e-color-warning, #c9902a);
    border-radius: 3px;

    &.error {
      border-color: var(--dnd35e-color-error, #a33);
      color: var(--dnd35e-color-error, #a33);
    }
  }

  .preparation-warning-body {
    display: flex;
    flex-direction: column;
  }

  .preparation-warning-source,
  .preparation-warning-field {
    font-weight: bold;
    font-size: 0.85rem;
  }

  .preparation-warning-message {
    font-size: 0.85rem;
  }

  .preparation-warning-uuid {
    font-family: var(--dnd35e-font-mono, monospace);
    font-size: 0.7rem;
    opacity: 0.6;
  }
</style>
