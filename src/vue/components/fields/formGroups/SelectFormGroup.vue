<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :value="resolvedValue"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :hideFieldControls="props.hideFieldControls"
    class="select-form-group"
  >
    <select
      :value="editValue"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLSelectElement).value)"
      class="form-control"
    >
      <option
        v-for="(opt, key) in options"
        :key="key"
        :value="opt.value"
        :class="opt.className"
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

<script setup lang="ts" generic="TValue extends string | number | null">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import FormGroup from './FormGroup.vue';
  import type { SelectFormGroupProps } from './types.mts';

  const props = defineProps<SelectFormGroupProps<TValue>>();

  const { isEditMode, isGM } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: { getIsFieldEditable, hasMaskForField, getViewAwareFieldValue },
    documentActions: { getViewAwareFieldUpdater },
    _storeUtils: { getSourceProperty },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<TValue | null>(() => 
    props.value !== undefined
      ? props.value
      : getViewAwareFieldValue<TValue>(props.fieldPath)
  );

  const readonlyLabel = computed(() => {
    const current = resolvedValue.value;
    if (current === undefined) return '';
    const matchedLabel = props.options.find(opt => opt.value === current)?.label;
    return localize(matchedLabel ?? String(current));
  });
  
  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });


  const sourceValue = getSourceProperty<TValue>(props.fieldPath);
  const editValue = computed(() => {
    if (props.value !== undefined || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return sourceValue.value ?? resolvedValue.value;
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onChange(val: string) {
    // Coerce based on the resolved value's type so numeric selects still write
    // numbers to the document even when no explicit `:value` prop is passed.
    const parsed = typeof resolvedValue.value === 'number'
      ? Number(val)
      : val;
    const updater = props.onUpdate
      ?? getViewAwareFieldUpdater(props.fieldPath);

    updater(parsed as TValue);
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
