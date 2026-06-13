<template>
  <div class="actor-tab attributes-tab">
    <AbilityScoresSection />
    <SpeedSection />
    <SensesSection />
    <TraitsSection />
  </div>
</template>

<script setup lang="ts">
  import AbilityScoresSection from '../components/AbilityScoresSection.vue';
  import SensesSection from './sections/attributes/SensesSection.vue';
  import SpeedSection from './sections/attributes/SpeedSection.vue';
  import TraitsSection from './sections/attributes/TraitsSection.vue';
</script>
