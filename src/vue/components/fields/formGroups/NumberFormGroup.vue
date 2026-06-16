<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :value="resolvedValue"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
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

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const slots = useSlots();

  const props = defineProps<{
    label?: string;
    hint?: string;
    value?: number | null;
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
    /** When true, forces the edit display even in play/true modes. */
    forceEdit?: boolean;
  }>();

  const { isEditMode, isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      hasMaskForField,
      getViewAwareFieldValue,
    },
    documentActions: {
      getDirectFieldUpdater,
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
    if (props.forceEdit) return false;  // forceEdit fields stay enabled
    return !isEditMode.value;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? getDirectFieldUpdater(props.fieldPath)
      : getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = getSourceProperty<number | null>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return resolvedValue.value;
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