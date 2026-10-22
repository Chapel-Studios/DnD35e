<template>
  <DmControl>
    <RichTextEditorFormGroup
      field-path="system.bio.gmNotes"
      class="gm-notes-editor"
      placeholder="dnd35e.CREATURE.FIELDS.bio.gmNotes.placeholder"
    />
  </DmControl>
</template>

<script setup lang="ts">
  import DmControl from '@vc/DmControl.vue';
  import { RichTextEditorFormGroup } from '@vc/fields/index.mjs';
</script>
