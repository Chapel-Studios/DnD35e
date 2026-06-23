<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :hideFieldControls="props.hideFieldControls"
    :value="resolvedValue"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
    <template v-if="slots.readonly" #readonly>
      <slot name="readonly" />
    </template>
    <div class="input-group">
      <span v-if="props.unit" class="unit">{{ props.unit }}</span>
      <input
        type="number"
        :value="editValue ?? ''"
        :disabled="isDisabled"
        :min="props.min"
        :max="props.max"
        :step="props.step"
        @change="onChange(($event.target as HTMLInputElement).value)"
        class="number-input"
      />
    </div>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import FormGroup from './FormGroup.vue';
  import type { NumberFormGroupProps } from './types.mts';

  const slots = useSlots();

  const props = defineProps<NumberFormGroupProps>();

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

  const resolvedValue = computed<number | null>(() =>
    props.value !== undefined ? props.value : getViewAwareFieldValue<number | null>(props.fieldPath) ?? null
  );

  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  const fieldUpdater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);

  const sourceValue = getSourceProperty<number | null>(props.fieldPath);
  const editValue = computed(() => {
    if (props.value !== undefined || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return sourceValue.value as number | null;
  });

  function onChange(val: string) {
    fieldUpdater(val === '' ? null : Number(val));
  }
</script>

<style scoped lang="scss">
  .input-group {
    position: relative;
    width: max-content;
    justify-self: center;

    .number-input {
      width: 6ch;
    }

    .unit {
      position: absolute;
      right: 0.25rem;
      top: 50%;
      transform: translateY(-50%);
      letter-spacing: 0.1rem;

      + .number-input {
        width: 9ch;
        padding-right: 2.5ch;
        text-align: right;
      }
    }
  }
</style>