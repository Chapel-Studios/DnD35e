<template>
  <section class="sheet-section summary-skills-section">
    <div class="skills-header">
      <span class="skills-title">{{ localize('dnd35e.ACTOR.section.Skills') }}</span>
      <div class="skills-col-headers">
        <span>{{ localize('dnd35e.ACTOR.stat.points') }}</span>
        <span>{{ localize('dnd35e.ACTOR.stat.total') }}</span>
      </div>
    </div>
    <div class="skills-list-placeholder"></div>
  </section>
</template>

<script lang="ts" setup>
  const localize = (key: string) => game.i18n.localize(key);
</script>

<style lang="scss" scoped>
  .summary-skills-section {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.25rem;
  }

  .skills-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--color-border-light-2, #ccc);
    padding-bottom: 0.2rem;
    margin-bottom: 0.25rem;
  }

  .skills-title {
    font-size: 0.75rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-dark-secondary, #555);
  }

  .skills-col-headers {
    display: flex;
    gap: 1.5rem;
    font-size: 0.6rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #666);
  }

  .skills-list-placeholder {
    flex: 1 1 auto;
    overflow-y: auto;
    min-height: 0;
  }
</style>
