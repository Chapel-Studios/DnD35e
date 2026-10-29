<template>
  <div class="preparation-warnings-tab">
    <p class="preparation-warnings-tab-intro">
      {{ warningSummary }}
    </p>
    <ul class="preparation-warnings-list">
      <li
        v-for="(warning) in warnings"
        :key="`${warning.sourceUuid}:${preparationWarningKey(warning)}`"
        class="preparation-warning-row"
        :class="warning.severity"
        :data-warning-id="warning.id ?? warning.field"
      >
        <i :class="warning.severity === 'error' ? 'fas fa-circle-exclamation' : 'fas fa-triangle-exclamation'"></i>
        <div class="preparation-warning-body">
          <span class="preparation-warning-source">{{ warning.sourcePath.join(' → ') }}</span>
          <span class="preparation-warning-field">{{ warning.field }}</span>
          <span class="preparation-warning-message">{{ warning.message }}</span>
          <span class="preparation-warning-status">
            {{ localize(warning.severity === 'error'
              ? 'dnd35e.COMMON.PreparationWarningError'
              : 'dnd35e.COMMON.PreparationWarningWarning') }}
            &middot;
            {{ localize(getPreparationWarningBannerState(warning).banner
              ? 'dnd35e.COMMON.PreparationWarningShowBanner'
              : 'dnd35e.COMMON.PreparationWarningTabOnly') }}
          </span>
          <span class="preparation-warning-uuid">{{ warning.sourceUuid }}</span>
        </div>
        <details v-if="canManagePreparationWarnings" class="preparation-warning-menu">
          <summary :aria-label="localize('dnd35e.COMMON.PreparationWarningManage')" :title="localize('dnd35e.COMMON.PreparationWarningManage')">
            <i class="fas fa-ellipsis-vertical" aria-hidden="true"></i>
          </summary>
          <div class="preparation-warning-menu-items">
            <button type="button" data-banner-mode="show" :disabled="pending" @click="setBanner(warning, true, $event)">
              {{ localize('dnd35e.COMMON.PreparationWarningShowBanner') }}
            </button>
            <button type="button" data-banner-mode="tab" :disabled="pending" @click="setBanner(warning, false, $event)">
              {{ localize('dnd35e.COMMON.PreparationWarningTabOnly') }}
            </button>
            <button type="button" data-banner-mode="default" :disabled="pending" @click="setBanner(warning, null, $event)">
              {{ localize('dnd35e.COMMON.PreparationWarningReset') }}
            </button>
          </div>
        </details>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { getPreparationWarningBannerState, preparationWarningKey } from '@documents/document/preparationWarningPreferences.mjs';
  import type { PreparationWarning } from '@documents/document/preparationWarnings.mjs';
  import { computed, inject } from 'vue';

  const { documentGetters, documentActions } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const canManagePreparationWarnings = documentGetters.canManagePreparationWarnings;
  const localize = (key: string): string => game.i18n.localize(key);
  const pending = documentGetters.isPreparationWarningUpdatePending;
  const warnings = documentGetters.preparationWarnings;
  const warningSummary = computed(() => game.i18n.format('dnd35e.COMMON.PreparationWarningsSummary', { count: warnings.value.length }));

  async function setBanner(warning: PreparationWarning, banner: boolean | null, event: Event): Promise<void> {
    const menu = (event.currentTarget as HTMLElement).closest('details');
    if (await documentActions.setPreparationWarningBanner(warning, banner)) menu?.removeAttribute('open');
  }
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
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .preparation-warning-menu {
    position: relative;
    flex: 0 0 auto;

    summary {
      cursor: pointer;
      list-style: none;
      padding: 0.25rem 0.5rem;
      border: 1px solid currentColor;
      border-radius: 3px;
    }

    summary::-webkit-details-marker {
      display: none;
    }
  }

  .preparation-warning-menu-items {
    position: absolute;
    right: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-width: 10rem;
    padding: 0.25rem;
    background: var(--background-color, var(--color-cool-5, #302831));
    border: 1px solid currentColor;
    border-radius: 3px;

    button {
      white-space: nowrap;
      text-align: left;
    }
  }

  .preparation-warning-status {
    font-size: 0.75rem;
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
