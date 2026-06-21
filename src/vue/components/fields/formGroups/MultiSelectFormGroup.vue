<template>
  <FormGroup
    class="multi-select-form-group"
    :label="label"
    :hint="hint"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    :show-field-controls="props.showFieldControls"
  >
    <div class="multi-select-checkboxes">
      <label
        v-for="(opt, index) in options"
        :key="index"
        class="multi-select-option"
      >
        <input
          type="checkbox"
          :value="opt.value"
          :checked="editValue.includes(opt.value)"
          :disabled="isDisabled"
          @change="onToggle(opt.value, ($event.target as HTMLInputElement).checked)"
        />
        <img
          v-if="opt.icon"
          :src="opt.icon"
          :alt="localize(opt.label)"
          class="multi-select-icon"
        />
        <span>{{ localize(opt.label) }}</span>
      </label>
    </div>
    <template #readonly>
      <div class="multi-select-checkboxes readonly">
        <span
          v-for="(opt, index) in selectedOptions"
          :key="index"
          class="multi-select-option"
        >
          <i class="fas fa-check" />
          <img
            v-if="opt.icon"
            :src="opt.icon"
            :alt="localize(opt.label)"
            class="multi-select-icon"
          />
          <span>{{ localize(opt.label) }}</span>
        </span>
      </div>
    </template>
  </FormGroup>
</template>

<script setup lang="ts" generic="TValue extends string | number">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import FormGroup from './FormGroup.vue';
  import type { MultiSelectFormGroupProps } from './types.mts';

  const props = defineProps<MultiSelectFormGroupProps<TValue>>();

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

  const resolvedValue = computed<TValue[]>(() =>
    props.value !== undefined
      ? [...(props.value ?? [])]
      : getViewAwareFieldValue<TValue[]>(props.fieldPath) ?? []
  );

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  const sourceValue = getSourceProperty<TValue[]>(props.fieldPath);
  const editValue = computed(() => {
    if (props.value !== undefined || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return (sourceValue.value ?? resolvedValue.value);
  });

  function onToggle(val: TValue, checked: boolean) {
    const current = editValue.value;
    const updated = checked
      ? [...current, val]
      : current.filter(v => v !== val);
    const updater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);
    updater(updated);
  }

  const selectedOptions = computed(() => props.options.filter(o => o.value !== null && resolvedValue.value.includes(o.value)));
</script>

<style scoped>
  .multi-select-checkboxes {
    display: grid;
    gap: 0.25rem;
    grid-template-columns: repeat(auto-fill, minmax(150px, max-content));
    width: 100%;
    padding: 0 1.5rem 0.5rem;
    justify-content: space-between;
  }

  .multi-select-option {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    margin: 0;
  }

  .multi-select-option input[type="checkbox"] {
    margin: 0;
  }

  .multi-select-icon {
    width: 1rem;
    height: 1rem;
    object-fit: contain;
  }
</style>
