<template>
  <div class="rich-text-editor" :class="{ editing: isEditing }">
    <div class="editor-header">
      <label v-if="label">{{ label }}</label>
      <button
        v-if="canEdit && !isEditing"
        type="button"
        class="edit-button"
        :aria-label="`Edit ${label || 'description'}`"
        @click="startEditing"
      >
        <i class="fas fa-feather" />
      </button>
    </div>

    <div v-if="isEditing" class="editor-container">
      <prose-mirror
        :name="field"
        :value="rawValue"
        :document-uuid="documentUuid"
        class="sized"
        @save="onSave"
      />
    </div>
    <div v-else class="editor-content" v-html="enrichedHtml" />
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { inject, onMounted, ref, watch } from 'vue';

  const props = withDefaults(defineProps<{
    field: string;
    label?: string;
  }>(), {});

  const store = inject('documentSheetStore') as DocumentSheetStore;
  const { getProperty, documentUuid } = store.documentGetters;
  const { updateDocument } = store.documentActions;
  const { canEdit } = store;
  const document = store._document;

  const rawValue = getProperty<string>(props.field);
  const isEditing = ref(false);

  // Enriched HTML for display mode
  const enrichedHtml = ref('');

  async function enrichContent () {
    const raw = rawValue.value;
    if (!raw) {
      enrichedHtml.value = '';
      return;
    }
    try {
      enrichedHtml.value = await foundry.applications.ux.TextEditor.enrichHTML(raw, {
        secrets: document.value.isOwner,
        rollData: {},
        relativeTo: document.value,
      });
    } catch {
      enrichedHtml.value = raw;
    }
  }

  // Enrich on mount and when raw value changes
  onMounted(enrichContent);
  watch(rawValue, enrichContent);

  function startEditing () {
    isEditing.value = true;
  }

  async function onSave (event: Event) {
    const target = event.target as HTMLElement & { value?: string };
    if (target.value !== undefined) {
      await updateDocument({ [props.field]: target.value });
      isEditing.value = false;
    }
  }
</script>

<style scoped>
.rich-text-editor {
  width: 100%;
  border: 1px solid var(--color-border-light-tertiary, #7a7971);
  border-radius: 3px;
  padding: 0.5rem;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.editor-header label {
  font-weight: bold;
  margin: 0;
}

.edit-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--color-text-light-6, #666);
  transition: color 0.2s;
}

.edit-button:hover {
  color: var(--color-text-dark-primary, #191813);
}

.editor-content {
  min-height: 2rem;
}

.editor-container {
  min-height: 200px;
}

.rich-text-editor.editing {
  border-color: var(--color-border-highlight, #7a7971);
}
</style>
