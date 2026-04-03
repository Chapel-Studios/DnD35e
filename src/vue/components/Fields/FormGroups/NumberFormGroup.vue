<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :value="value"
    :read-only="props.readOnly"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template v-if="slots.readonly" #readonly>
      <slot name="readonly" />
    </template>
    <input
      type="number"
      :value="editValue ?? ''"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
    <span v-if="props.unit">{{ props.unit }}</span>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const slots = useSlots();

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: number | null;
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: number | null) => void;
    unit?: string;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
    /** When true, forces the readonly display. */
    readOnly?: boolean;
  }>();

  const { isEditViewMode, isIdentifiedViewMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentActions: {
      getDirectFieldUpdater,
      getViewAwareFieldUpdater,
    },
    _storeUtils: {
      getSourceProperty,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !isEditViewMode.value;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? getDirectFieldUpdater(props.fieldPath)
      : getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = getSourceProperty<number | null>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    if (!isIdentifiedViewMode.value) return props.value;
    return sourceValue.value as number | null;
  });

  function onChange(val: string) {
    fieldUpdater(val === '' ? null : Number(val));
  }
</script>
