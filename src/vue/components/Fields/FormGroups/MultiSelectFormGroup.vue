<template>
  <FormGroup
    class="multi-select-form-group"
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :read-only="props.readOnly"
  >
    <div class="multi-select-checkboxes">
      <label
        v-for="opt in options"
        :key="opt.value"
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
          :alt="localize(opt.label).value"
          class="multi-select-icon"
        />
        <span>{{ localize(opt.label) }}</span>
      </label>
    </div>
    <template #readonly>
      <div class="multi-select-checkboxes readonly">
        <span
          v-for="opt in selectedOptions"
          :key="opt.value"
          class="multi-select-option"
        >
          <i class="fas fa-check" />
          <img
            v-if="opt.icon"
            :src="opt.icon"
            :alt="localize(opt.label).value"
            class="multi-select-icon"
          />
          <span>{{ localize(opt.label) }}</span>
        </span>
      </div>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';
  import type { MultiSelectOption } from './types.mjs';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: string[];
    options: MultiSelectOption[];
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    onUpdate?: (value: string[]) => void;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
    /** When true, forces the readonly display. */
    readOnly?: boolean;
  }>();

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const localize = store.localize;
  const isDisabled = computed(() => {
    const storeCanEdit = store?.isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? store.documentActions.getDirectFieldUpdater(props.fieldPath)
      : store.documentActions.getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = store.documentGetters.getSourceProperty<string[]>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    return (sourceValue.value ?? props.value) as string[];
  });

  function onToggle(val: string, checked: boolean) {
    const current = editValue.value;
    const updated = checked
      ? [...current, val]
      : current.filter(v => v !== val);
    fieldUpdater(updated);
  }

  const selectedOptions = computed(() => props.options.filter(o => props.value.includes(o.value)));
</script>

<style scoped>
  .multi-select-checkboxes {
    display: grid;
    gap: 0.25rem;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    width: 100%;
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
