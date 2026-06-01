<template>
  <section class="sheet-section senses-section">
    <h2 class="section-header">{{ localize('dnd35e.CREATURE.FIELDS.bio.senses.label') }}</h2>
    <TextFormGroup
      field-path="system.bio.senses"
      direct-update
    />
  </section>
</template>

<script setup lang="ts">
  import { TextFormGroup } from '@vc/fields/index.mjs';

  const localize = (key: string) => game.i18n.localize(key);
</script>

<style lang="scss" scoped>
  .senses-section {
    padding: 0.25rem;
  }
</style>
