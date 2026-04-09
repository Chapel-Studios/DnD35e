<template>
  <div v-if="isGM" class="gm-section">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
  const isGM = game.user.isGM;
</script>

<style scoped>
.gm-section {
  background: rgba(128, 0, 128, 0.06);
  border: 1px solid rgba(128, 0, 128, 0.2);
  border-radius: 4px;
  padding: 0.5rem;
}

/* Consecutive gm-sections merge into one visual block */
.gm-section + .gm-section {
  border-top: 1px dashed rgba(128, 0, 128, 0.15);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  margin-top: -1px;
}

/* Remove bottom rounding on sections followed by another */
.gm-section:has(+ .gm-section) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
