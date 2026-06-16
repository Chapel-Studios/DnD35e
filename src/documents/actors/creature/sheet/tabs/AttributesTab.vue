<template>
  <div class="actor-tab attributes-tab">
    <PhysicalAttributes />
    <CombatAttributes />
  </div>
</template>

<script setup lang="ts">
  import CombatAttributes from './sections/attributes/CombatAttributes.vue';
  import PhysicalAttributes from './sections/attributes/PhysicalAttributes.vue';
</script>

<style lang="scss" scoped>
  .attributes-tab {
    display: grid;
    gap: 0.5rem;
    width: 100%;
  }
</style>
