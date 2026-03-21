<template>
  <FormGroup
    :label="label"
    :hint="hint"
    :localize-hint="localizeHint"
    :field-path="field"
    :default-visibility="defaultVisibility"
    :default-editability="defaultEditability"
    class="rich-text-form-group"
    :class="{ editing: isEditing }"
  >
    <!-- Edit button in controls slot -->
    <template #controls>
      <button
        v-if="isEditButtonVisible"
        type="button"
        class="edit-button"
        :aria-label="`Edit ${label || 'content'}`"
        @click="startEditing"
      >
        <i class="fas fa-feather" />
      </button>
      <slot name="controls" />
    </template>

    <!-- Editable: prose-mirror when editing, enriched HTML otherwise -->
    <div v-if="isEditing" class="editor-container">
      <prose-mirror
        :name="field"
        :value="editorValue"
        :document-uuid="documentUuid"
        class="sized"
        @save="onSave"
      />
    </div>
    <div v-else>
      <div v-if="!!enrichedHtml" class="editor-content" v-html="enrichedHtml" />
      <div v-else class="editor-content placeholder">
        {{ placeholder ? localize(placeholder) : '' }}
      </div>
    </div>

    <!-- Readonly: just enriched HTML (no editing possible) -->
    <template #readonly>
      <div v-if="!!enrichedHtml" class="editor-content" v-html="enrichedHtml" />
      <div v-else class="editor-content placeholder">
        {{ placeholder ? localize(placeholder) : '' }}
      </div>
    </template>
  </FormGroup>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { computed, inject, onMounted, ref, watch } from 'vue';

  import type { FieldEditability, FieldVisibility } from './fieldPermissions.mjs';
  import FormGroup from './FormGroup.vue';

  const props = defineProps<{
    field: string; // The document field path for the rich text content
    label?: string; // Localization key for the label
    hint?: string; // Localization key for hint text
    localizeHint?: boolean; // Whether to localize hint (default: true)
    placeholder?: string; // Placeholder text when content is empty
    // Layout options
    // is now always stacked, will leave here in case we want to make it optional in the future
    // stacked?: boolean; // Label above content instead of beside (default: true for rich text)
    // Field permissions
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
    /** When true, the editor uses derived data instead of source data. */
    editDerived?: boolean;
    /** When true, uses the store's direct field updater instead of view-aware. */
    directUpdate?: boolean;
  }>();

  const {
    documentGetters: { getProperty, getSourceProperty, documentUuid, getEffectiveFieldValue },
    documentActions: { getViewAwareFieldUpdater, getDirectFieldUpdater },
    isEditable,
    localize,
    _storeUtils: { document },
  } = inject('documentSheetStore') as DocumentSheetStore;

  // Raw value from the document
  const rawValue = getProperty<string>(props.field);

  // Source value for editing (pre-active-effect data)
  const sourceRawValue = getSourceProperty<string>(props.field);

  // Effective value considering view mode (shows override when viewing as unidentified)
  // Ensure it's always a string to avoid Vue patching errors with null
  const effectiveValue = computed(() =>
    getEffectiveFieldValue(props.field, rawValue.value) ?? ''
  );

  // Editor value: use source data by default, derived if editDerived is set
  const editorValue = computed(() => {
    if (props.editDerived) return effectiveValue.value;
    return sourceRawValue.value ?? '';
  });

  // Field updater: respects directUpdate flag
  const fieldUpdater = props.directUpdate
    ? getDirectFieldUpdater(props.field)
    : getViewAwareFieldUpdater(props.field);

  // Editing state
  const isEditing = ref(false);

  function startEditing() {
    isEditing.value = true;
  }

  const isEditButtonVisible = computed(() => !isEditing.value && isEditable.value);

  async function onSave(event: Event) {
    const target = event.target as HTMLElement & { value?: string };
    if (target.value !== undefined) {
      await fieldUpdater(target.value);
      isEditing.value = false;
    }
  }

  // Enriched HTML for display mode
  const enrichedHtml = ref('');

  async function enrichContent() {
    const value = effectiveValue.value;
    if (!value) {
      enrichedHtml.value = '';
      return;
    }
    try {
      enrichedHtml.value = await foundry.applications.ux.TextEditor.enrichHTML(value, {
        secrets: document.value.isOwner,
        rollData: {},
        relativeTo: document.value,
      });
    } catch {
      enrichedHtml.value = value;
    }
  }

  onMounted(enrichContent);
  watch(effectiveValue, enrichContent);
</script>

<style scoped lang="scss">
  .rich-text-form-group {
    &.form-group {
      display: inline;
      border: 1px solid var(--color-border, #7a7971);
      padding: 0.25rem 0.5rem 0.5rem;
    }

    &.editing {
      border-color: var(--color-fieldset-border-highlight, #7a7971);
    }

    &:deep(label) {
      font-family: var(--font-h4);
      font-size: var(--font-h4-size);
      color: var(--color-text-primary);
      font-weight: bold;
      display: grid;
      grid-auto-flow: column;
      justify-items: start;
      justify-content: start;
      grid-gap: 0.5rem;
    }

    &.stacked {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
  }

  .edit-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    // color: var(--color-text-light-6, #666);
    transition: color 0.2s;
    opacity: 0.5;
    transition: opacity 0.15s ease;

    &:hover {
      // color: var(--color-text-primary, #191813);
      opacity: 1;
    }
  }

  .editor-content {
    min-height: 2rem;
  }

  .editor-content.placeholder {
    font-style: italic;
    color: var(--color-text-light-6, #666);
  }

  .editor-container {
    min-height: 200px;
  }
</style>
