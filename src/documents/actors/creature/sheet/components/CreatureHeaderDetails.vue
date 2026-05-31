<template>
  <div class="creature-header-details">
    <div class="xp-row">
      <span class="xp-label">{{ localize('dnd35e.ACTOR.header.xp') }}</span>
      <div class="xp-bar-wrap">
        <div class="xp-bar" :style="{ width: '0%' }"></div>
      </div>
      <span class="xp-value">0 / 0</span>
    </div>

    <div class="detail-row">
      <div class="detail-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.gender') }}</span>
        <span class="detail-value">—</span>
      </div>
      <div class="detail-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.alignment') }}</span>
        <span class="detail-value">—</span>
      </div>
      <div class="detail-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.deity') }}</span>
        <span class="detail-value">—</span>
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.age') }}</span>
        <span class="detail-value">—</span>
      </div>
      <div class="detail-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.height') }}</span>
        <span class="detail-value">—</span>
      </div>
      <div class="detail-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.weight') }}</span>
        <span class="detail-value">—</span>
      </div>
    </div>

    <div class="race-row">
      <div class="race-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.race') }}</span>
        <span class="detail-value race-placeholder">{{ localize('dnd35e.ACTOR.header.racePlaceholder') }}</span>
      </div>
      <div class="speed-cell">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.landSpeed') }}</span>
        <span class="detail-value">—</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  const localize = (key: string) => game.i18n.localize(key);
</script>

<style lang="scss" scoped>
  .creature-header-details {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.25rem 0.5rem 0.4rem;
    border-bottom: 1px solid var(--color-border-light-2, #ccc);
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
    font-size: 0.75rem;
  }

  .xp-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .xp-label {
    font-weight: bold;
    color: var(--color-text-dark-secondary, #666);
    min-width: 1.5rem;
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.05em;
  }

  .xp-bar-wrap {
    flex: 1 1 auto;
    height: 8px;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.08));
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 4px;
    overflow: hidden;
  }

  .xp-bar {
    height: 100%;
    background: var(--color-level-info, #4477aa);
    transition: width 0.3s ease;
  }

  .xp-value {
    color: var(--color-text-dark-secondary, #666);
    min-width: 5rem;
    text-align: right;
  }

  .detail-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.25rem;
  }

  .race-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
    align-items: center;
  }

  .detail-cell,
  .race-cell,
  .speed-cell {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
  }

  .detail-label {
    font-weight: bold;
    color: var(--color-text-dark-secondary, #666);
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .detail-value {
    color: var(--color-text-dark-primary, #191813);
  }

  .race-placeholder {
    color: var(--color-text-dark-secondary, #888);
    font-style: italic;
  }

  .speed-cell {
    white-space: nowrap;
  }
</style>
