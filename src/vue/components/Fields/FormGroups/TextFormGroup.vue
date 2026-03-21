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
    <template v-if="slots.controls" #controls>
      <slot name="controls" />
    </template>
    <template v-if="slots.readonly" #readonly>
      <slot name="readonly" />
    </template>
    <input
      type="text"
      :value="editValue"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const slots = useSlots();
  const props = defineProps<{
    label?: string;
    hint?: string;
    value: string;
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: string) => void;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const isDisabled = computed(() => {
    const storeCanEdit = store.isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? store.documentActions.getDirectFieldUpdater(props.fieldPath)
      : store.documentActions.getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = store.documentGetters.getSourceProperty<string>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    return sourceValue.value as string;
  });

  function onChange(val: string) {
    fieldUpdater(val);
  }
</script>
