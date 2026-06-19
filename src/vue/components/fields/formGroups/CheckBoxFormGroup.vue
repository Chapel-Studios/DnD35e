<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    class="checkbox-form-group"
  >
    <input
      type="checkbox"
      :checked="editValue"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).checked)"
      class="checkbox-input"
    />
    <template #readonly>
      <input
        type="checkbox"
        :checked="resolvedValue"
        disabled
      />
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value?: boolean;
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: boolean) => void;
    /** When true, forces the readonly display. */
    readOnly?: boolean;
    /** When true, forces the edit display even in play/true modes. */
    forceEdit?: boolean;
  }>();

  const { isEditMode, isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      getIsFieldEditable,
      hasMaskForField,
      getViewAwareFieldValue,
    },
    documentActions: {
      getViewAwareFieldUpdater,
    },
    _storeUtils: {
      getSourceProperty,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<boolean>(() =>
    props.value !== undefined ? props.value : getViewAwareFieldValue<boolean>(props.fieldPath) ?? false
  );

  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  const fieldUpdater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);

  const sourceValue = getSourceProperty<boolean>(props.fieldPath);
  const editValue = computed(() => {
    if (props.value !== undefined || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return sourceValue.value as boolean;
  });

  function onChange(val: boolean) {
    fieldUpdater(val);
  }
</script>

<style scoped>
.checkbox-form-group {
  .checkbox-input {
    justify-self: center;
  }
}
</style>
