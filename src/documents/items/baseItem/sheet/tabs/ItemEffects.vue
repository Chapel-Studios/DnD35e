<template>
  <section
    class="effects-tab"
    v-show="isActiveTab"
    data-group="primary"
    data-tab="effects"
  >
    <div class="effects-header">
      <h3>{{ localize('dnd35e.EFFECT.Effects') }}</h3>
      <button
        v-if="isEditMode"
        type="button"
        class="create-effect-btn"
        @click="createEffect"
      >
        <i class="fas fa-plus" />
        {{ localize('dnd35e.EFFECT.Create') }}
      </button>
    </div>

    <div class="effects-list">

      <slot name="effects-list-prepend" />

      <!-- Temporary Effects -->
      <EffectCategory
        v-if="temporaryEffects.length"
        :label="localize('dnd35e.EFFECT.Temporary').value"
        :effects="temporaryEffects"
        :can-edit="isEditMode"
      />

      <!-- Passive Effects -->
      <EffectCategory
        v-if="passiveEffects.length"
        :label="localize('dnd35e.EFFECT.Passive').value"
        :effects="passiveEffects"
        :can-edit="isEditMode"
      />

      <!-- Inactive Effects -->
      <EffectCategory
        v-if="inactiveEffects.length"
        :label="localize('dnd35e.EFFECT.Inactive').value"
        :effects="inactiveEffects"
        :can-edit="isEditMode"
      />

      <slot name="effects-list-append" />

      <!-- Empty State -->
      <div v-if="isEmpty" class="effects-empty">
        <p>{{ localize('dnd35e.EFFECT.None') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { RenderModeStore, TabStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol, TabStoreSymbol } from '@documents/document/index.mjs';
  import type { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { computed, inject } from 'vue';

  import EffectCategory from '../components/EffectCategory.vue';

  const {
    hasAddedEffects,
  } = defineProps<{
    hasAddedEffects?: boolean;
  }>();

  const {
    documentGetters: {
      effects,
      temporaryEffects,
      passiveEffects,
      inactiveEffects,
    },
    documentActions: {
      createEffect,
    },
    _storeUtils: {
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as ItemSheetStore;
  const { getIsTabOpen } = inject(TabStoreSymbol) as TabStore;
  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const isActiveTab = getIsTabOpen('effects');

  const isEmpty = computed(() => !effects.value.length && !hasAddedEffects);
</script>

<style scoped lang="scss">
  .effects-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0.5rem;
  }

  .effects-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.5rem;

    h3 {
      margin: 0;
      font-size: 1.25rem;
    }

    .create-effect-btn {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
      cursor: pointer;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .effects-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .effects-empty {
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
    padding: 2rem;
  }
</style>
