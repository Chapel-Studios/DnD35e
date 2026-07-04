<template>
  <div class="actor-tab actor-description-tab">
    <slot name="prepend" />
    <DescriptionEditor />
    <slot name="append" />
  </div>
</template>

<script setup lang="ts">
  import { DescriptionEditor } from '@documents/document/index.mjs';

  withDefaults(defineProps<{
    descriptionLabel?: string;
  }>(), {
    descriptionLabel: 'dnd35e.COMMON.Description',
  });
</script>

<style scoped>
  .actor-description-tab {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 0.5rem;
  }

  /* All direct children (description editor + anything in the slot) share space equally */
  .actor-description-tab > :deep(*) {
    flex: 1;
  }
</style>
