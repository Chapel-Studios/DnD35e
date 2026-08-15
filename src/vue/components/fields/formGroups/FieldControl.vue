<template>
  <button
    type="button"
    class="field-control-btn"
    :title="title"
  >
    <i :class="icon"></i>
  </button>
</template>

<script setup lang="ts">
  // This isn't implemented yet and for now the system isn't complex enough to need it,
  // but this is a placeholder for a component that will be likely needed later when we need better sort control, etc.

  defineProps<{
    fieldPath: string;
    title?: string;
    icon: string;
  }>();
</script>

<style scoped lang="scss">
</style>
