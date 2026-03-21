<template>
  <button
    v-if="showBoth && isIdentifiable"
    class="identified-view-toggle"
    :class="{ 'show-unidentified': editorViewMode === 'unidentified' }"
    @click="editorViewActions.toggleEditorView()"
    :title="toggleTitle"
  >
    <i class="fas" :class="buttonIcon"></i>
    {{ buttonLabel }}
  </button>
</template>

<script setup lang="ts">
  import type { IdentifiableDocumentStore } from '@ec/Identifiable/index.mjs';
  import { computed, inject } from 'vue';

  const {
    unidentifiedVisibilityMode: { showBoth },
    editorViewActions,
    editorViewMode,
    documentGetters: { isIdentifiable },
  } = inject('documentSheetStore') as IdentifiableDocumentStore;

  const buttonLabel = computed(() => {
    if (editorViewMode.value === 'identified') {
      return game.i18n.localize('D35E.ShowingIdentified');
    }
    return game.i18n.localize('D35E.ShowingUnidentified');
  });

  const buttonIcon = computed(() => {
    return editorViewMode.value === 'identified' ? 'fa-eye' : 'fa-eye-slash';
  });

  const toggleTitle = computed(() => {
    if (editorViewMode.value === 'identified') {
      return game.i18n.localize('D35E.ToggleToUnidentified');
    }
    return game.i18n.localize('D35E.ToggleToIdentified');
  });
</script>

<style scoped>
  .identified-view-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--color-border-light);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .identified-view-toggle:hover {
    background: var(--color-bg-hover);
  }

  .identified-view-toggle.show-unidentified {
    background: var(--color-region-background, rgba(100, 100, 100, 0.1));
  }

  .identified-view-toggle i {
    font-size: 0.85rem;
  }
</style>
