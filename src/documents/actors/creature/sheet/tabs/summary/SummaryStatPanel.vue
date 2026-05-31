<template>
  <section class="sheet-section summary-stat-panel">
    <button type="button" class="rest-button">
      {{ localize('dnd35e.ACTOR.action.rest') }}
    </button>

    <!-- Health -->
    <div class="stat-group health-group">
      <div class="stat-group-label">{{ localize('dnd35e.ACTOR.stat.hp') }}</div>
      <div class="health-current-row">
        <span class="hp-current">0</span>
        <span class="hp-sep">/</span>
        <span class="hp-max">0</span>
      </div>
      <div class="health-secondary-row">
        <span>{{ localize('dnd35e.ACTOR.stat.temp') }}: 0</span>
        <span class="health-sep">|</span>
        <span>{{ localize('dnd35e.ACTOR.stat.nonlethal') }}: 0</span>
      </div>
    </div>

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

    <!-- AC trio -->
    <div class="stat-trio-row">
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.ac') }}</div>
        <div class="stat-cell-value">10</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.touch') }}</div>
        <div class="stat-cell-value">10</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.flatFooted') }}</div>
        <div class="stat-cell-value">10</div>
      </div>
    </div>

    <!-- Saves trio -->
    <div class="stat-trio-row">
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.fort') }}</div>
        <div class="stat-cell-value">0</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.ref') }}</div>
        <div class="stat-cell-value">0</div>
      </div>
      <div class="stat-cell">
        <div class="stat-cell-label">{{ localize('dnd35e.ACTOR.stat.will') }}</div>
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

  .rest-button {
    width: 100%;
    padding: 0.3rem 0.5rem;
    background: var(--color-level-info, #4477aa);
    color: #fff;
    border: 1px solid var(--color-border-dark, #666);
    border-radius: 3px;
    font-weight: bold;
    font-size: 0.8rem;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    &:hover {
      background: var(--color-level-success, #336699);
    }
  }

  .stat-group {
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 3px;
    padding: 0.2rem 0.3rem;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
  }

  .stat-group-label {
    font-size: 0.6rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #666);
    margin-bottom: 0.15rem;
  }

  .health-current-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.2rem;
    font-size: 1.1rem;
    font-weight: bold;
  }

  .hp-current { color: var(--color-level-success, #2d6e2d); }
  .hp-sep { color: var(--color-text-dark-secondary, #888); }
  .hp-max { color: var(--color-text-dark-secondary, #888); }

  .health-secondary-row {
    display: flex;
    justify-content: center;
    gap: 0.3rem;
    font-size: 0.7rem;
    color: var(--color-text-dark-secondary, #666);
    margin-top: 0.1rem;
  }

  .health-sep {
    color: var(--color-border-light-2, #ccc);
  }

  .stat-pair-row,
  .stat-trio-row {
    display: grid;
    gap: 0.25rem;
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 3px;
    padding: 0.2rem 0.3rem;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
  }

  .stat-pair-row {
    grid-template-columns: 1fr 1fr;
  }

  .stat-trio-row {
    grid-template-columns: 1fr 1fr 1fr;
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

  .actions-group {
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 3px;
    padding: 0.2rem 0.3rem;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
    flex: 1 1 auto;
    min-height: 2rem;
  }

  .actions-empty-list {
    min-height: 2rem;
  }
</style>
