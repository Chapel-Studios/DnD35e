<template>
  <div class="actor-tab attributes-tab">
    <AbilityScoresSection />
    <HpSection />
    <SavingThrowsSection />
    <InitiativeSpeedSection />
    <ArmorClassSection />
  </div>
</template>

<script setup lang="ts">
  import AbilityScoresSection from './sections/attributes/AbilityScoresSection.vue';
  import ArmorClassSection from './sections/attributes/ArmorClassSection.vue';
  import HpSection from './sections/attributes/HpSection.vue';
  import InitiativeSpeedSection from './sections/attributes/InitiativeSpeedSection.vue';
  import SavingThrowsSection from './sections/attributes/SavingThrowsSection.vue';
</script>
