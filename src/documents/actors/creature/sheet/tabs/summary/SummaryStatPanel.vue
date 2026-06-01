<template>
  <section class="sheet-section summary-stat-panel">
    <!-- Initiative + BAB -->
    <div class="stat-pair-row">
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.initiative') }}</div>
        <div class="stat-cell-value">0</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.bab') }}</div>
        <div class="stat-cell-value">0</div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
  const localize = (key: string) => game.i18n.localize(key);
</script>

<style lang="scss" scoped>
  .summary-stat-panel {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.25rem;
    font-size: 0.8rem;
  }

  .stat-pair-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem;
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 3px;
    padding: 0.2rem 0.3rem;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
  }

  .stat-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05rem;
  }

  .stat-cell-label {
    font-size: 0.6rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #666);
  }

  .stat-cell-value {
    font-size: 1rem;
    font-weight: bold;
    color: var(--color-text-dark-primary, #191813);
    line-height: 1.1;
  }
</style>
