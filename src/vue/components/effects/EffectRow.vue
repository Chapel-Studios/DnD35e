<template>
  <tr
    class="effect-row"
    :class="{ 'effect-disabled': effect.disabled, 'effect-hidden': effect.system.isHidden }"
  >
    <td class="effect-cell">
      <img :src="effect.img || 'icons/svg/aura.svg'" :alt="effect.name" class="effect-icon" />
      <span class="effect-name">{{ effect.name }}</span>
      <slot name="effect-badge" :effect="effect" />
      <div v-if="!readOnly" class="effect-controls">
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
    </td>
  </tr>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectDocumentActions } from '@documents/document/logic/index.mjs';
  import type { ActiveEffectDnd35e } from '@effects/index.mjs';
  import type { ComputedRef } from 'vue';
  import { inject } from 'vue';

  /** Minimal shape any document sheet store (Item or Actor) must provide for this row. */
  interface EffectRowHostStore {
    documentActions: EffectDocumentActions;
    _storeUtils: {
      createLocalizedComputed: (text: string) => ComputedRef<string>;
    };
  }

  const {
    effect,
    canEdit,
    showVisibilityToggle = true,
    readOnly = false,
  } = defineProps<{
    effect: ActiveEffectDnd35e;
    canEdit: boolean;
    showVisibilityToggle?: boolean;
    /** Hides all mutation controls (edit/toggle/delete/visibility) - for rows representing
     * effects this sheet doesn't own (e.g. a transferred effect displayed on the actor
     * that owns it via an equipped item). */
    readOnly?: boolean;
  }>();

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
  } = inject(DocumentSheetStoreSymbol) as EffectRowHostStore;

  const effectEnablementTitle = (effectItem: ActiveEffectDnd35e) => effectItem.disabled
    ? createLocalizedComputed('dnd35e.EFFECT.Enable')
    : createLocalizedComputed('dnd35e.EFFECT.Disable');

  const handleDelete = async (effectItem: ActiveEffectDnd35e) => {
    await removeEffect(effectItem.id);
  };

  const handleEdit = (effectItem: ActiveEffectDnd35e) => {
    editEffect(effectItem.id);
  };

  const handleToggle = async (effectItem: ActiveEffectDnd35e) => {
    await toggleEffect(effectItem.id);
  };

  const handleToggleHidden = async (effectItem: ActiveEffectDnd35e) => {
    await toggleEffectHidden(effectItem.id);
  };
</script>

<style scoped lang="scss">
  .effect-row {
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

  .effect-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }

  .effect-icon {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    object-fit: cover;
  }

  .effect-name {
    flex: 1;
  }

  .effect-controls {
    display: flex;
    gap: 0.25rem;
  }

  .effect-control {
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    padding: 0.25rem;

    &:hover {
      opacity: 1;
    }

    &.is-active {
      opacity: 1;
      color: var(--color-active, #4b7cff);
    }

    &.delete:hover {
      color: var(--color-negative, #cf3d3d);
    }
  }
</style>
