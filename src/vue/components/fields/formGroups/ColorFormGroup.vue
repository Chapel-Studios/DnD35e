<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :is-dm-only="isDmOnly"
    :field-path="fieldPath"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    :read-only="props.readOnly"
    :force-edit="props.forceEdit"
    class="color-form-group"
  >
    <input
      type="color"
      :value="editValue ?? DEFAULT_COLOR"
      :disabled="isDisabled"
      @change="onChange(($event.target as HTMLInputElement).value)"
      class="form-control"
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
    /** When true, forces the readonly display. */
    readOnly?: boolean;
    /** When true, forces the edit display even in play/true modes. */
    forceEdit?: boolean;
  }>();

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
      createLocalizedComputed: localize,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedValue = computed<string | null>(() =>
    props.value !== undefined ? props.value : getViewAwareFieldValue<string | null>(props.fieldPath) ?? null
  );

  const isDisabled = computed(() => {
    if (props.disabled) return true;
    return !getIsFieldEditable(props.fieldPath, props.defaultEditability, !!props.forceEdit).value;
  });

  const fieldUpdater = props.onUpdate ?? getViewAwareFieldUpdater(props.fieldPath);

  const sourceValue = getSourceProperty<string | null>(props.fieldPath);
  const editValue = computed(() => {
    if (props.value !== undefined || !sourceValue) return resolvedValue.value;
    if (!isGM.value && isEditMode.value && hasMaskForField(props.fieldPath).value) return resolvedValue.value;
    return sourceValue.value as string | null;
  });

  const DEFAULT_COLOR = '#ffffff';

  function onChange(val: string) {
    fieldUpdater(val);
  }
</script>

<style scoped lang="scss">
  .color-form-group {
    .form-control {
      justify-self: center;
    }

    .color-display {
      width: 60px;
      height: 30px;
      border: 1px solid var(--color-border);
    }
  }
</style>
