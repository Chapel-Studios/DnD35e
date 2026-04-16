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
  import type { DocumentSheetStore, RenderModeStore } from '@ec/CoreMixin/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
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

  const sourceValue = getSourceProperty<boolean>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    if (!isIdentifiedViewMode.value) return props.value;
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
