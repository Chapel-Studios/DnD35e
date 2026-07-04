<template>
  <RichTextEditorFormGroup 
    field-path="system.notes" 
    class="notes-editor"
    label="dnd35e.ACTOR.FIELDS.sessionNotes.label"
    placeholder="dnd35e.ACTOR.FIELDS.sessionNotes.placeholder"
  />
</template>

<script setup lang="ts">
  import { RichTextEditorFormGroup } from '@vc/fields/index.mjs';
</script>

<style scoped>

</style>
