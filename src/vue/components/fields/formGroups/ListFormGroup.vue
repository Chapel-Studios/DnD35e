<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    class="list-form-group"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :show-field-controls="props.showFieldControls"
  >
    <!-- Controls slot: add item button -->
    <template #controls="{ editable }">
      <button
        v-if="editable && !isDisabled && canAddMore"
        type="button"
        class="field-control-btn add-item-btn"
        :title="localize(addButtonTitle)"
        @click="addItem"
      >
        <i class="fas fa-plus" />
      </button>
      <slot name="controls" :editable="editable" />
    </template>

    <!-- Editable list -->
    <div class="list-items">
      <div v-if="editItems.length === 0" class="empty-list">
        <slot name="empty">
          <span class="empty-label">{{ localize(emptyLabel) }}</span>
        </slot>
      </div>
      <div v-for="(item, index) in editItems" :key="index" class="list-item">
        <slot name="item-edit" :item="item" :index="index" :disabled="isDisabled" />
        <button
          v-if="!isDisabled"
          type="button"
          class="remove-item-btn"
          :title="localize(removeButtonTitle)"
          @click="removeItem(index)"
        >
          <i class="fas fa-times" />
        </button>
      </div>
    </div>

    <!-- Readonly display -->
    <template #readonly>
      <slot name="readonly">
        <div class="list-items readonly">
          <span v-if="readonlyItems.length === 0" class="empty-label">{{ localize(emptyLabel) }}</span>
          <span v-for="(item, index) in readonlyItems" :key="index" class="list-item-display">
            <slot name="item-readonly" :item="item" :index="index" />{{ index < readonlyItems.length - 1 ? ', ' : '' }}
          </span>
        </div>
      </slot>
    </template>
  </FormGroup>
</template>

<script setup lang="ts" generic="TItem">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, onMounted, useSlots } from 'vue';

  import FormGroup from './FormGroup.vue';
  import type { ListFormGroupProps } from './types.mts';

  const props = withDefaults(defineProps<ListFormGroupProps<TItem>>(), {
    emptyLabel: 'dnd35e.form.emptyList',
  });

  const slots = useSlots();

  // Enforce that consumers wire up the slots ListFormGroup needs to render.
  // The edit slot is required (no sensible default for arbitrary item shapes),
  // and at least one of `readonly` (whole-list display) or `item-readonly`
  // (per-item display) must be supplied.
  onMounted(() => {
    if (!slots['item-edit']) {
      console.warn('[ListFormGroup] missing required slot: #item-edit');
    }
    if (!slots.readonly && !slots['item-readonly']) {
      console.warn(
        '[ListFormGroup] missing slot: provide either #readonly (whole-list view) or #item-readonly (per-item view).'
      );
    }
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      getIsFieldEditable,
      hasMaskForField,
      getViewAwareFieldValue,
    },
    isGM,
    documentActions: {
      getViewAwareFieldUpdater,
    },
    _storeUtils: {
      getSourceProperty,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<TItem[]>(() => props.value
    ?? getViewAwareFieldValue<TItem[]>(props.fieldPath)
    ?? []
  );

  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  const fieldUpdater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);

  const sourceValue = getSourceProperty<TItem[]>(props.fieldPath);

  /** The items currently shown in the edit UI. */
  const editItems = computed((): TItem[] => {
    // If consumer provided an explicit value, trust it — they've already resolved
    // any source/derived/mask logic (e.g. when fieldPath points to a wrapper object
    // rather than the array itself).
    if (props.value !== undefined) return resolvedValue.value;
    if (!sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) {
      return resolvedValue.value;
    }
    const src = sourceValue.value;
    return src ?? resolvedValue.value;
  });

  /** The items shown in the readonly display. */
  const readonlyItems = computed((): TItem[] => {
    return resolvedValue.value;
  });

  const canAddMore = computed(() => {
    if (props.maxItems && props.maxItems > 0) {
      return editItems.value.length < props.maxItems;
    }
    return true;
  });

  function addItem(): void {
    props.onAddItem();
  }

  function removeItem(index: number): void {
    const newItems = editItems.value.filter((_, i) => i !== index);
    fieldUpdater(newItems);
  }
</script>

<style scoped lang="scss">
  .list-form-group.form-group {
    display: grid;
    grid-auto-flow: row;
    justify-items: center;
    position: relative;
    border: 1px solid var(--color-border);
    margin-top: 0.75rem;

    :deep(.form-group-label) {
      flex-direction: row;
      position: absolute;
      top: 0;
      left: 0.5rem;
      transform: translateY(-45%);
      background: var(--background); /* Foundry default variable */
      padding: 0 0.5rem;
    }
  }

  .list-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    margin-top: 0.75em;
    width: 100%;
    height: 100%;

    &.readonly {
      margin-top: 0;
    }
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-select-option-bg);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 0.25rem;
  }

  .empty-list {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .empty-label {
    opacity: 0.6;
  }

  .remove-item-btn {
    flex-shrink: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s;
    padding: 0.125rem 0.25rem;
    color: var(--color-level-error);

    &:hover {
      opacity: 1;
    }
  }
</style>
