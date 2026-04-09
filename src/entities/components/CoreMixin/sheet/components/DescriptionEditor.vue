<template>
  <RichTextEditorFormGroup 
    field="system.description.value" 
    label="D35E.Description"
    class="description-editor"
    placeholder="Enter a description..."
  />
</template>

<script setup lang="ts">
  import { RichTextEditorFormGroup } from '@vc/Fields/index.mjs';
</script>

<style scoped>
  .description-editor {
    grid-column: span 2;
  }
</style>
