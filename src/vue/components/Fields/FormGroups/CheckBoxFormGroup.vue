<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
  >
    <div class="form-fields">
      <input
        type="checkbox"
        :checked="editValue"
        :disabled="isDisabled"
        @change="onChange(($event.target as HTMLInputElement).checked)"
      />
    </div>
    <template #readonly>
      <input
        type="checkbox"
        :checked="value"
        disabled
      />
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: boolean;
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: boolean) => void;
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

  const sourceValue = store.documentGetters.getSourceProperty<boolean>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    return sourceValue.value as boolean;
  });

  function onChange(val: boolean) {
    fieldUpdater(val);
  }
</script>

<style scoped>
.form-fields {
  justify-self: end;
}
</style>
