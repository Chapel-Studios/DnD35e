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
      :value="selectedIndex"
      :disabled="isDisabled"
      @change="onChange($event)"
      class="form-control"
    >
      <option
        v-for="(opt, key) in options"
        :key="`${key}-${opt.label}`"
        :value="key"
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

  // The <select>/<option> elements are bound by index (not by the typed value) because
  // native DOM `value` coercion for `HTMLSelectElement`/`HTMLOptionElement` differs for
  // `null` (e.g. select.value = null becomes "", while an option's value = null can become
  // "null"), which can prevent a `null`-valued option from being selected on initial render.
  const selectedIndex = computed(() => {
    const idx = props.options.findIndex(opt => opt.value === editValue.value);
    return idx === -1 ? '' : String(idx);
  });

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onChange(event: Event) {
    // Read the selected option's original typed value via index rather than
    // event.target.value, which is always a string and can't represent `null`.
    const select = event.target as HTMLSelectElement;
    const selectedOption = props.options[select.selectedIndex];
    const value = selectedOption ? selectedOption.value : null;
    const updater = props.onUpdate
      ?? getViewAwareFieldUpdater(props.fieldPath);

    updater(value);
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
