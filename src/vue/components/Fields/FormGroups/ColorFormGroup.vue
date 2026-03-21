<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
  >
    <input
      type="color"
      :value="editValue ?? '#ffffff'"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
    <template #readonly>
      <div
        class="color-display"
        :style="{ backgroundColor: value ?? '#ffffff' }"
      ></div>
      {{ value ?? localize('D35E.NoColor') }}
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability,FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value: string | null;
    isDmOnly?: boolean;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** Only used for overriding store behavior. */
    disabled?: boolean;
    /** Optional updater override. When omitted, derives from the store using fieldPath. */
    onUpdate?: (value: string | null) => void;
    /** When true, edit inputs show derived data instead of source data. */
    editDerived?: boolean;
    /** When true and no onUpdate, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const { isEditable, localize } = store;
  const isDisabled = computed(() => {
    const storeCanEdit = isEditable;
    if (props.disabled) return true;
    return storeCanEdit ? !storeCanEdit.value : false;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? store.documentActions.getDirectFieldUpdater(props.fieldPath)
      : store.documentActions.getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = store.documentGetters.getSourceProperty<string | null>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return props.value;
    return sourceValue.value as string | null;
  });

  function onChange(val: string) {
    fieldUpdater(val);
  }
</script>

<style scoped>
  .color-display {
    width: 60px;
    height: 30px;
    border: 1px solid var(--color-border);
  }
</style>
