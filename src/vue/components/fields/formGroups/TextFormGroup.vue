<template>
  <FormGroup
    :label="props.label"
    :hint="props.hint"
    :field-path="props.fieldPath"
    :default-visibility="props.defaultVisibility"
    :default-editability="props.defaultEditability"
    :value="resolvedValue"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :show-field-controls="props.showFieldControls"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template #readonly>
      <slot name="readonly">
        <span>{{ readonlyLabel }}</span>
      </slot>
    </template>
    <input
      type="text"
      :value="editValue"
      :disabled="isDisabled"
      :minlength="props.minLength"
      :maxlength="props.maxLength"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import FormGroup from './FormGroup.vue';
  import type { TextFormGroupProps } from './types.mts';

  const slots = useSlots();
  const props = defineProps<TextFormGroupProps>();

  const { isEditMode, isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: { getIsFieldEditable, hasMaskForField, getViewAwareFieldValue },
    documentActions: { getViewAwareFieldUpdater },
    _storeUtils: { getSourceProperty },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<string>(() => (
    props.value !== undefined
      ? (props.value ?? '')
      : (getViewAwareFieldValue<string>(props.fieldPath) ?? '')
  ));
  
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  const sourceValue = getSourceProperty<string>(props.fieldPath);
  const editValue = computed(() => {
    if (props.value !== undefined || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return sourceValue.value as string;
  });

  function onChange(val: string) {
    const fieldUpdater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);
    fieldUpdater(val);
  }

  const readonlyLabel = computed(() => {
    return resolvedValue.value || '-';
  });
</script>
