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
    :hideFieldControls="props.hideFieldControls"
    class="combobox-form-group"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template v-if="slots.editOnlyControls" #edit-only-controls="{ editable }">
      <slot name="edit-only-controls" :editable="editable" />
    </template>
    <ComboBox
      :value="editValue"
      :options="props.options"
      :allow-custom="props.allowCustom"
      :placeholder="props.placeholder"
      :disabled="isDisabled"
      @update="onChange"
    />
    <template #readonly>
      <slot name="readonly">
        <span>{{ readonlyLabel }}</span>
      </slot>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import ComboBox from '../ComboBox.vue';
  import FormGroup from './FormGroup.vue';
  import type { ComboBoxFormGroupProps } from './types.mts';

  const slots = useSlots();
  const props = withDefaults(defineProps<ComboBoxFormGroupProps>(), {
    allowCustom: true,
  });

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
    if (props.value !== undefined || !sourceValue) {
      return resolvedValue.value;
    }

    if (
      !isEditMode.value
      || (
        !isGM.value
        && isEditMode.value
        && hasMaskForField(props.fieldPath).value
      )
    ) {
      return resolvedValue.value;
    }
    
    return sourceValue.value as string;
  });

  const readonlyLabel = computed(() => {
    const option = props.options.find(({ value }) => value === resolvedValue.value);
    return game.i18n.localize(option?.label ?? resolvedValue.value);
  });

  function onChange(value: string): void {
    const updater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);
    updater(value);
  }
</script>
