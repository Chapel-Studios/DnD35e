<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :show-field-controls="props.showFieldControls"
  >
    <div class="form-fields">
      <ToggleSwitch
        :checked="editValue"
        :disabled="isDisabled"
        :true-label="trueLabel"
        :false-label="falseLabel"
        :flip="props.flip"
        @update="onChange"
      />
    </div>
    <template #readonly>
      <span v-if="resolvedValue" class="true toggle-value">
        {{ localizedTrueLabel }}
      </span>
      <span v-else class="false toggle-value">
        {{ localizedFalseLabel }}
      </span>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import ToggleSwitch from '../ToggleSwitch.vue';
  import FormGroup from './FormGroup.vue';
  import type { ToggleSwitchFormGroupProps } from './types.mts';

  const props = defineProps<ToggleSwitchFormGroupProps>();

  const { isEditMode, isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: { getIsFieldEditable, hasMaskForField, getViewAwareFieldValue },
    documentActions: { getViewAwareFieldUpdater },
    _storeUtils: { getSourceProperty },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<boolean>(() => (
    props.value !== undefined
      ? (props.value ?? false)
      : (getViewAwareFieldValue<boolean>(props.fieldPath) ?? false)
  ));

  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  const localizedTrueLabel = computed(() => props.trueLabel ? game.i18n.localize(props.trueLabel) : '');
  const localizedFalseLabel = computed(() => props.falseLabel ? game.i18n.localize(props.falseLabel) : '');

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
.form-fields {
  justify-self: end;
}
</style>
