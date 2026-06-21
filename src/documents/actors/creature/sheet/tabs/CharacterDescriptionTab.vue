<template>
  <CreatureDescriptionTab>
    <RichTextEditorFormGroup
      field-path="system.notes"
      placeholder="dnd35e.ACTOR.field.SessionNotesPlaceholder"
    />
  </CreatureDescriptionTab>
</template>

<script setup lang="ts">
  import { RichTextEditorFormGroup } from '@vc/fields/index.mjs';

  import CreatureDescriptionTab from './CreatureDescriptionTab.vue';
</script>
