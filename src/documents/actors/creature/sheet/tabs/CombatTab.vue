<template>
  <div class="actor-tab combat-tab">
    <AttackBonusSection />
    <WeaponsSection />
  </div>
</template>

<script setup lang="ts">
  import AttackBonusSection from './sections/combat/AttackBonusSection.vue';
  import WeaponsSection from './sections/combat/WeaponsSection.vue';
</script>
