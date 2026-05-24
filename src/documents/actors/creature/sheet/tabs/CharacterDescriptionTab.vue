<template>
  <CreatureDescriptionTab>
    <RichTextEditorFormGroup
      field="system.notes"
      label="dnd35e.ACTOR.field.SessionNotes"
      placeholder="dnd35e.ACTOR.field.SessionNotesPlaceholder"
    />
    <slot />
  </CreatureDescriptionTab>
</template>

<script setup lang="ts">
  import { RichTextEditorFormGroup } from '@vc/fields/index.mjs';

  import CreatureDescriptionTab from './CreatureDescriptionTab.vue';
</script>
