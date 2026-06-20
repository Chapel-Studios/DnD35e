<template>
  <RichTextEditorFormGroup 
    field-path="system.description" 
    class="description-editor"
    placeholder="dnd35e.ACTOR.FIELDS.description.placeholder"
  />
</template>

<script setup lang="ts">
  import { RichTextEditorFormGroup } from '@vc/fields/index.mjs';
</script>

<style scoped>
  .description-editor {
    grid-column: span 2;
  }
</style>
