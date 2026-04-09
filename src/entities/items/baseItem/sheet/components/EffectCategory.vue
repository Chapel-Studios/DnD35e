<template>
  <div class="effect-category">
    <div class="category-header">
      <h4>{{ label }}</h4>
    </div>
    <ul class="effect-list">
      <li
        v-for="effect in effects"
        :key="effect.id"
        class="effect-item"
        :class="{ 'effect-disabled': effect.disabled }"
      >
        <img :src="effect.img || 'icons/svg/aura.svg'" :alt="effect.name" class="effect-icon" />
        <span class="effect-name">{{ effect.name }}</span>
        <div class="effect-controls">
          <button
            type="button"
            class="effect-control"
            :title="createLocalizedComputed('D35E.EffectEdit').value"
            @click="handleEdit(effect)"
          >
            <i class="fas fa-edit" />
          </button>
          <button
            type="button"
            class="effect-control"
            :title="effectEnablementTitle(effect).value"
            :disabled="!canEdit"
            @click="handleToggle(effect)"
          >
            <i :class="effect.disabled ? 'fas fa-toggle-off' : 'fas fa-toggle-on'" />
          </button>
          <button
            type="button"
            class="effect-control delete"
            :title="createLocalizedComputed('D35E.EffectDelete').value"
            :disabled="!canEdit"
            @click="handleDelete(effect)"
          >
            <i class="fas fa-trash" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { DnD35eActiveEffect } from '@effects/index.mjs';
  import { inject } from 'vue';

  import { ItemSheetStore } from '../ItemSheetStore.mjs';

  defineProps<{
    label: string;
    effects: DnD35eActiveEffect[];
    canEdit: boolean;
  }>();

  const {
    documentActions: {
      editEffect,
      toggleEffect,
      removeEffect,
    },
    _storeUtils: {
      createLocalizedComputed,
    },
  } = inject(DocumentSheetStoreSymbol) as ItemSheetStore;
  const effectEnablementTitle = (effect: DnD35eActiveEffect) => effect.disabled
    ? createLocalizedComputed('D35E.EffectEnable')
    : createLocalizedComputed('D35E.EffectDisable');

  const handleDelete = async (effect: DnD35eActiveEffect) => {
    await removeEffect(effect.id);
  };

  const handleEdit = (effect: DnD35eActiveEffect) => {
    editEffect(effect.id);
  };

  const handleToggle = async (effect: DnD35eActiveEffect) => {
    await toggleEffect(effect.id);
  };
</script>

<style scoped lang="scss">
  .effect-category {
    background: var(--color-select-option-bg);
    border-radius: 4px;
    overflow: hidden;
  }

  .category-header {
    background: var(--color-bg-btn);
    padding: 0.5rem 0.75rem;

    h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }
  }

  .effect-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .effect-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }

    &.effect-disabled {
      opacity: 0.6;
    }
  }

  .effect-icon {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    object-fit: cover;
  }

  .effect-name {
    flex: 1;
    font-size: 0.875rem;
  }

  .effect-controls {
    display: flex;
    gap: 0.25rem;
  }

  .effect-control {
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    color: var(--color-text-primary);
    opacity: 0.7;

    &:hover:not(:disabled) {
      opacity: 1;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    &.delete:hover:not(:disabled) {
      color: var(--color-level-error);
    }
  }
</style>
