<template>
  <tr
    class="effect-row"
    :class="{ 'effect-disabled': isDisabled, 'effect-hidden': isHidden }"
  >
    <td class="effect-cell">
      <button
        v-if="changes.length"
        type="button"
        class="effect-expand"
        :title="expanded
          ? createLocalizedComputed('dnd35e.EFFECT.CollapseDetails').value
          : createLocalizedComputed('dnd35e.EFFECT.ExpandDetails').value"
        @click="expanded = !expanded"
      >
        <i class="fas" :class="expanded ? 'fa-chevron-down' : 'fa-chevron-right'" />
      </button>
      <img :src="img || 'icons/svg/aura.svg'" :alt="name" class="effect-icon" />
      <span class="effect-name">{{ name }}</span>
      <slot name="effect-badge" :effect="effect" />
      <div v-if="!readOnly && canEdit" class="effect-controls">
        <button
          v-if="showVisibilityToggle && isGM && canEdit"
          type="button"
          class="effect-control"
          :class="{ 'is-active': !isHidden }"
          :title="isHidden
            ? createLocalizedComputed('dnd35e.EFFECT.ShowEffect').value
            : createLocalizedComputed('dnd35e.EFFECT.HideEffect').value"
          @click="handleToggleHidden(effect)"
        >
          <i :class="isHidden ? 'fas fa-eye-slash' : 'fas fa-eye'" />
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
          :class="{ 'is-active': !isDisabled }"
          :title="effectEnablementTitle"
          @click="handleToggle(effect)"
        >
          <i :class="isDisabled ? 'fas fa-toggle-off' : 'fas fa-toggle-on'" />
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
  <EffectChangeRow
    v-for="(change, index) in (expanded ? changes : [])"
    :key="index"
    :change="change"
    :index="index"
  />
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { EffectDocumentActions } from '@documents/document/logic/index.mjs';
  import type { EffectRowStore } from '@effects/baseActiveEffect/sheet/effectRowStoreRegistry.mjs';
  import type { ActiveEffectDnd35e } from '@effects/index.mjs';
  import EffectChangeRow from '@vc/effects/EffectChangeRow.vue';
  import type { ComputedRef } from 'vue';
  import { computed, inject, ref } from 'vue';

  /** Minimal shape any document sheet store (Item or Actor) must provide for this row. */
  interface EffectRowHostStore {
    documentActions: EffectDocumentActions;
    documentGetters: {
      getOrCreateEffectRowStore: (effect: ActiveEffectDnd35e) => EffectRowStore;
    };
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
    documentGetters: {
      getOrCreateEffectRowStore,
    },
    _storeUtils: {
      createLocalizedComputed,
    },
  } = inject(DocumentSheetStoreSymbol) as EffectRowHostStore;

  // Row-scoped store for THIS effect - every field displayed below reads from it (not the
  // `effect` prop directly) so this row stays reactive even if the parent doesn't hand this
  // component a fresh `effect` object on re-render. Mutation actions above still go through
  // the HOST store (`editEffect`/`toggleEffect`/etc.), since those operate on the parent's
  // owned-effects collection, not this row's own store.
  //
  // Skipped for `readOnly` (transferred) rows: those effects belong to a DIFFERENT parent
  // document (the source item) than whichever host store is injected here (the actor), so
  // there's no store to cache/refresh them against - they fall back to reading the raw
  // `effect` prop, same as before.
  const effectRowStore = readOnly ? null : getOrCreateEffectRowStore(effect);
  const isDisabled = computed(() => effectRowStore ? effectRowStore.documentGetters.isDisabled.value : (effect.disabled ?? false));
  const isHidden = computed(() => effectRowStore ? effectRowStore.documentGetters.isHidden.value : (effect.system.isHidden ?? false));
  const changes = computed(() => effectRowStore ? effectRowStore.documentGetters.changes.value : (effect.system.changes ?? []));
  const name = computed(() => effectRowStore ? effectRowStore.documentGetters.name.value : effect.name);
  const img = computed(() => effectRowStore ? effectRowStore.documentGetters.img.value : effect.img);

  const expanded = ref(false);

  const effectEnablementTitle = computed(() => isDisabled.value
    ? createLocalizedComputed('dnd35e.EFFECT.Enable').value
    : createLocalizedComputed('dnd35e.EFFECT.Disable').value
  );

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

  .effect-expand {
    background: none;
    border: none;
    padding: 0;
    opacity: 0.6;
    cursor: pointer;
    width: 1rem;

    &:hover {
      opacity: 1;
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

