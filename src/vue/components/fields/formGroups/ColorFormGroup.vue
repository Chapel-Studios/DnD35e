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
      :value="editValue ?? DEFAULT_COLOR"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
    />
    <template #readonly>
      <div
        class="color-display"
        :style="{ backgroundColor: resolvedValue ?? DEFAULT_COLOR }"
      ></div>
      {{ resolvedValue ?? localize('dnd35e.COMMON.NoColor') }}
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    label?: string;
    hint?: string;
    value?: string | null;
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
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<string | null>(() =>
    props.value !== undefined ? props.value : getViewAwareFieldValue<string | null>(props.fieldPath) ?? null
  );

  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !isEditMode.value;
  });

  const fieldUpdater = props.onUpdate ?? (
    props.directUpdate
      ? getDirectFieldUpdater(props.fieldPath)
      : getViewAwareFieldUpdater(props.fieldPath)
  );

  const sourceValue = getSourceProperty<string | null>(props.fieldPath);
  const editValue = computed(() => {
    if (props.editDerived || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return sourceValue.value as string | null;
  });

  const DEFAULT_COLOR = '#ffffff';

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
