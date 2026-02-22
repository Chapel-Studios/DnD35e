<template>
  <div class="description-wrapper">
    <h3 class="form-header">{{ localize(heading) }}</h3>
    <RichTextEditor :field="field" class="description-editor" />
  </div>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
  import { RichTextEditor } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  interface Props {
    heading?: string;
    field?: string;
  }

  const {
    localize,
  } = inject('documentSheetStore') as DocumentSheetStore;

  withDefaults(defineProps<Props>(), {
    heading: 'D35E.Description',
    field: 'system.description.value',
  });
</script>

<style scoped>
  .description-wrapper {
    display: contents;
  }
  
  .description-editor {
    grid-column: span 2;
  }

  .form-header {
    grid-column: span 2;
    margin: 1rem 0 0.25rem;
    text-decoration: underline;
  }
</style>
