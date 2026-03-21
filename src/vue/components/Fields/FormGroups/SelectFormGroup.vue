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

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';
  import { SelectOption } from './types.mjs';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: any;
    options: SelectOption[];
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: any) => void;
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

  const sourceValue = store.documentGetters.getSourceProperty<any>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    return sourceValue.value ?? props.value;
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onChange(val: any) {
    fieldUpdater(val);
  }
</script>
