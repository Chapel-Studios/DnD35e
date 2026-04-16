<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :value="value"
  >
    <select
      :value="editValue"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ localize(opt.label) }}
      </option>
    </select>
    <template #readonly>
      <span>
        {{ localize(options.find(opt => opt.value === value)?.label ?? String(value)) }}
      </span>
    </template>
  </FormGroup>
</template>

<script setup lang="ts" generic="TValue extends string | number">
  import type { DocumentSheetStore, RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';
  import type { SelectOption } from './types.mjs';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: TValue;
    options: SelectOption<TValue>[];
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: TValue) => void;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  const { isEditViewMode, isIdentifiedViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentActions: { getDirectFieldUpdater, getViewAwareFieldUpdater },
    _storeUtils: { getSourceProperty },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !isEditViewMode.value;
  });

  const fieldUpdater = props.onUpdate
    ?? (
      props.directUpdate
        ? getDirectFieldUpdater(props.fieldPath)
        : getViewAwareFieldUpdater(props.fieldPath)
    );

  const sourceValue = getSourceProperty<TValue>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    // When viewing as unidentified, show the effective (override) value for editing
    if (!isIdentifiedViewMode.value) return props.value;
    return sourceValue.value ?? props.value;
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onChange(val: string) {
    const parsed = typeof props.value === 'number' ? Number(val) : val;
    fieldUpdater(parsed as TValue);
  }
</script>
