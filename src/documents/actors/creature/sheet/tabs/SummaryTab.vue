<template>
  <div class="actor-tab summary-tab">
    <IdentitySection />
    <PhysicalTraitsSection />
    <ExperienceSection />
    <LanguagesSection />
  </div>
</template>

<script setup lang="ts">
  import ExperienceSection from './sections/summary/ExperienceSection.vue';
  import IdentitySection from './sections/summary/IdentitySection.vue';
  import LanguagesSection from './sections/summary/LanguagesSection.vue';
  import PhysicalTraitsSection from './sections/summary/PhysicalTraitsSection.vue';
</script>
