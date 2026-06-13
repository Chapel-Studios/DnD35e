<template>
  <div class="actor-tab summary-tab">
    <SummarySkillsSection class="summary-skills" />

    <!-- Actions placeholder -->
    <div class="actions-group">
      <div class="stat-group-label">{{ localize('dnd35e.ACTOR.section.Actions') }}</div>
      <div class="actions-empty-list"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import SummarySkillsSection from './SummarySkillsSection.vue';
  
  const localize = (key: string) => game.i18n.localize(key);
</script>

<style lang="scss" scoped>
  .summary-tab {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) minmax(170px, 1.2fr) 2fr;
    grid-template-rows: 1fr;
    gap: 0.5rem;
    height: 100%;
    overflow: hidden;
  }

  .summary-abilities,
  .summary-stats,
  .summary-skills {
    overflow-y: auto;
    min-height: 0;
  }
</style>

