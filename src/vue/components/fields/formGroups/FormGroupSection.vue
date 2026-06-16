<template>
  <div v-if="isSectionVisible" class="form-group-section" :class="sectionClasses">
    <div class="form-group-section-header">
      <label :title="labelTooltip">{{ resolvedLabel }}</label>
      <FieldControls
        :field-path="props.fieldPath"
        :default-editability="props.defaultEditability"
        :default-visibility="props.defaultVisibility"
      >
        <slot name="controls" />
      </FieldControls>
    </div>
    <div class="form-group-section-content">
      <slot v-if="!useReadonlySlot" />
      <slot v-else name="readonly" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject, useSlots } from 'vue';

  import FieldControls from './FieldControls.vue';
  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import { everyoneVisibility } from './fieldPermissions.mjs';

  const slots = useSlots();

  const props = defineProps<{
    label: string;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
  }>();

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      getIsFieldVisible,
      getIsFieldEditable,
    },
    _storeUtils: {
      getFieldHint,
      resolveVisibility,
      getProperty,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const resolvedLabel = computed(() => localize(props.label));

  const resolvedHint = computed(() => getFieldHint(props.fieldPath));

  const labelTooltip = computed(() => resolvedHint.value || undefined);

  const isFieldVisible = getIsFieldVisible(props.fieldPath, props.defaultVisibility);

  // Check if ANY child field is visible (hide section when all children are hidden)
  const hasVisibleChild = computed((): boolean => {
    const data = getProperty<Record<string, unknown> | null>(props.fieldPath).value;
    if (!data || typeof data !== 'object') return true;
    const childKeys = Object.keys(data);
    if (childKeys.length === 0) return true;
    return childKeys.some(key => {
      const childPath = `${props.fieldPath}.${key}`;
      return getIsFieldVisible(childPath).value;
    });
  });

  // Section visible only if section-level AND at least one child is visible
  const isSectionVisible = computed(() => isFieldVisible.value && hasVisibleChild.value);

  const isVisibilityRestricted = computed(() => resolveVisibility(props.fieldPath, props.defaultVisibility) !== everyoneVisibility);

  const sectionClasses = computed(() => ({
    'restricted-visibility': isVisibilityRestricted.value,
  }));

  const isSectionEditable = computed((): boolean => {
    if (!isEditMode.value) return false;
    return getIsFieldEditable(props.fieldPath, props.defaultEditability).value;
  });

  const useReadonlySlot = computed(() => !isSectionEditable.value && !!slots.readonly);
</script>

<style scoped lang="scss">
  .form-group-section {
    border: 1px solid var(--color-border, #7a7971);
    position: relative;
    margin-top: 0.5em;

    .form-group-section-header {
      position: absolute;
      top: 0;
      left: 0.5rem;
      transform: translateY(-45%);
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: var(--background); /* Foundry default variable */
      padding: 0 0.5rem;
    }

    .form-group-section-header label {
      margin: 0;
    }

    .form-group-section-content {
      display: grid;
      grid-auto-flow: column;
      justify-items: center;
      margin-top: 0.75em;

      :deep(.form-group) {
        border: none;
      }
    }
  }
</style>
