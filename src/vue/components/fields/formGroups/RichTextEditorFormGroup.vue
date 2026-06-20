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
    <template #controls="{ editable }">
      <button
        v-if="editable && isEditButtonVisible"
        type="button"
        class="field-control-btn edit-button"
        :aria-label="editAriaLabel"
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
  import type { DocumentSheetStore, RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
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
  }>();

  const { isEditMode } = inject(RenderModeStoreSymbol) as RenderModeStore;
  const {
    documentGetters: {
      documentUuid,
      getViewAwareFieldValue,
    },
    documentActions: { getViewAwareFieldUpdater },
    _storeUtils: {
      getSourceProperty,
      getSchemaField,
      createLocalizedComputed: localize,
      enrichHTML,
    },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  // Source value for editing (pre-active-effect data)
  const sourceRawValue = getSourceProperty<string>(props.field);

  // Effective value considering view mode (shows override when viewing as unidentified)
  // Ensure it's always a string to avoid Vue patching errors with null
  const effectiveValue = computed(() =>
    getViewAwareFieldValue<string>(props.field) ?? ''
  );

  // Editor value: when a source property exists, edit the source data.
  // Otherwise use the effective value.
  const editorValue = computed(() => {
    if (!sourceRawValue) return effectiveValue.value;
    return sourceRawValue.value ?? '';
  });

  const fieldUpdater = getViewAwareFieldUpdater(props.field);

  // Editing state
  const isEditing = ref(false);

  function startEditing() {
    isEditing.value = true;
  }

  const isEditButtonVisible = computed(() => !isEditing.value && isEditMode.value);
  const editAriaLabel = computed(() => {
    const localizedLabel = props.label
      ? game.i18n.localize(props.label)
      : (getSchemaField(props.field)?.options?.label as string | undefined)
        ?? game.i18n.localize('dnd35e.UI.Content');
    return game.i18n.format('dnd35e.UI.EditField', { field: localizedLabel });
  });

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
    enrichedHtml.value = await enrichHTML(value);
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
