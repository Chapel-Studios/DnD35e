<template>
  <div class="actor-tab attributes-tab">
    <ActorSpeed />
    <SensesSection />
    <TraitsSection />
  </div>
</template>

<script setup lang="ts">
  import ActorSpeed from '@actors/baseActor/sheet/components/ActorSpeed.vue';

  import SensesSection from './sections/attributes/SensesSection.vue';
  import TraitsSection from './sections/attributes/TraitsSection.vue';
</script>
