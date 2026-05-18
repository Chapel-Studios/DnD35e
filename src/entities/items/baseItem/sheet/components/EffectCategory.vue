<template>
  <div class="effect-category">
    <button
      type="button"
      class="category-header"
      :aria-expanded="!isCollapsed"
      @click="toggleCollapsed"
    >
      <h4>{{ label }}: {{ effects.length }}</h4>
      <i :class="isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-down'" />
    </button>
    <div v-if="!isCollapsed">
      <ul class="effect-list">
        <li
          v-for="effect in effects"
          :key="effect.id"
          class="effect-item"
          :class="{ 'effect-disabled': effect.disabled, 'effect-hidden': effect.system.isHidden }"
        >
          <img :src="effect.img || 'icons/svg/aura.svg'" :alt="effect.name" class="effect-icon" />
          <span class="effect-name">{{ effect.name }}</span>
          <slot name="effect-badge" :effect="effect" />
          <div class="effect-controls">
            <button
              v-if="showVisibilityToggle && isGM && canEdit"
              type="button"
              class="effect-control"
              :class="{ 'is-active': !effect.system.isHidden }"
              :title="effect.system.isHidden
                ? createLocalizedComputed('dnd35e.EFFECT.ShowEffect').value
                : createLocalizedComputed('dnd35e.EFFECT.HideEffect').value"
              @click="handleToggleHidden(effect)"
            >
              <i :class="effect.system.isHidden ? 'fas fa-eye-slash' : 'fas fa-eye'" />
            </button>
            <button
              type="button"
              class="effect-control"
              :title="createLocalizedComputed('dnd35e.EFFECT.Edit').value"
              @click="handleEdit(effect)"
            >
              <i class="fas fa-edit" />
            </button>
            <button
              type="button"
              class="effect-control"
              :class="{ 'is-active': !effect.disabled }"
              :title="effectEnablementTitle(effect).value"
              @click="handleToggle(effect)"
            >
              <i :class="effect.disabled ? 'fas fa-toggle-off' : 'fas fa-toggle-on'" />
            </button>
            <button
              v-if="canEdit"
              type="button"
              class="effect-control delete"
              :title="createLocalizedComputed('dnd35e.EFFECT.Delete').value"
              @click="handleDelete(effect)"
            >
              <i class="fas fa-trash" />
            </button>
          </div>
        </li>
      </ul>
      <div v-if="slots.actions" class="effect-category-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import type { ActiveEffectDnd35e } from '@effects/index.mjs';
  import { inject, ref, useSlots } from 'vue';

  import type { ItemSheetStore } from '../ItemSheetStore.mjs';

  const {
    showVisibilityToggle = true,
    defaultCollapsed = false,
  } = defineProps<{
    label: string;
    effects: ActiveEffectDnd35e[];
    canEdit: boolean;
    showVisibilityToggle?: boolean;
    defaultCollapsed?: boolean;
  }>();
  const slots = useSlots();

  const isCollapsed = ref(defaultCollapsed);

  const isGM = game.user.isGM;

  const {
    documentActions: {
      editEffect,
      toggleEffect,
      removeEffect,
      toggleEffectHidden,
    },
    _storeUtils: {
      createLocalizedComputed,
    },
  } = inject(DocumentSheetStoreSymbol) as ItemSheetStore;
  const effectEnablementTitle = (effect: ActiveEffectDnd35e) => effect.disabled
    ? createLocalizedComputed('dnd35e.EFFECT.Enable')
    : createLocalizedComputed('dnd35e.EFFECT.Disable');

  const handleDelete = async (effect: ActiveEffectDnd35e) => {
    await removeEffect(effect.id);
  };

  const handleEdit = (effect: ActiveEffectDnd35e) => {
    editEffect(effect.id);
  };

  const handleToggle = async (effect: ActiveEffectDnd35e) => {
    await toggleEffect(effect.id);
  };

  const handleToggleHidden = async (effect: ActiveEffectDnd35e) => {
    await toggleEffectHidden(effect.id);
  };

  const toggleCollapsed = () => {
    isCollapsed.value = !isCollapsed.value;
  };
</script>

<style scoped lang="scss">
  .effect-category {
    background: var(--color-select-option-bg);
    border-radius: 4px;
    overflow: hidden;
  }

  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: var(--color-bg-btn);
    padding: 0.5rem 0.75rem;
    border: none;
    cursor: pointer;
    color: inherit;
    text-align: left;

    h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
    }

    &:hover {
      background: var(--color-hover-bg);
    }
  }

  .effect-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .effect-category-actions {
    border-top: 1px solid var(--color-border);
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

    &.effect-hidden {
      background: rgba(128, 0, 128, 0.04);

      .effect-name {
        font-style: italic;
      }
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
    opacity: 0.4;

    &.is-active {
      opacity: 0.8;
    }

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
