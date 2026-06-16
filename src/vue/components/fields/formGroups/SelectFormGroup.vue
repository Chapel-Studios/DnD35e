<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :value="resolvedValue"
    class="select-form-group"
  >
    <select
      :value="editValue"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLSelectElement).value)"
      class="form-control"
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
      <slot name="readonly">
        <span>{{ readonlyLabel }}</span>
      </slot>
    </template>
  </FormGroup>
</template>

<script setup lang="ts" generic="TValue extends string | number">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';
  import type { SelectOption } from './types.mjs';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value?: TValue;
    options: SelectOption<TValue>[];
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: TValue) => void;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  const { isEditMode, isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: { hasMaskForField, getViewAwareFieldValue },
    documentActions: { getDirectFieldUpdater, getViewAwareFieldUpdater },
    _storeUtils: { getSourceProperty },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<TValue>(() =>
    props.value !== undefined ? props.value : getViewAwareFieldValue<TValue>(props.fieldPath)
  );

  const readonlyLabel = computed(() => {
    const current = resolvedValue.value;
    if (current === undefined) return '';
    const matchedLabel = props.options.find(opt => opt.value === current)?.label;
    return localize(matchedLabel ?? String(current));
  });
  
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !isEditMode.value;
  });

  const fieldUpdater = props.onUpdate
    ?? (
      props.directUpdate
        ? getDirectFieldUpdater(props.fieldPath)
        : getViewAwareFieldUpdater(props.fieldPath)
    );

  const sourceValue = getSourceProperty<TValue>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return sourceValue.value ?? resolvedValue.value;
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onChange(val: string) {
    // Coerce based on the resolved value's type so numeric selects still write
    // numbers to the document even when no explicit `:value` prop is passed.
    const parsed = typeof resolvedValue.value === 'number' ? Number(val) : val;
    fieldUpdater(parsed as TValue);
  }
</script>

<style lang="scss" scoped>
  .select-form-group {

    .form-control {
      width: max-content;
      justify-self: center;
    }
  }
</style>
