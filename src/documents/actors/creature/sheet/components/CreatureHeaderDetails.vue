<template>
  <div class="creature-header-details">
    <!-- XP – stub until level system lands -->
    <div class="xp-row">
      <span class="xp-label">{{ localize('dnd35e.ACTOR.header.xp') }}</span>
      <div class="xp-bar-wrap">
        <div class="xp-bar" :style="{ width: '0%' }"></div>
      </div>
      <span class="xp-value">0 / 0</span>
    </div>

    <!-- Row 1: gender | alignment | deity -->
    <div class="detail-row">
      <CreatureGender />
      <CreatureAlignment />
      <CreatureDeity />
    </div>

    <!-- Row 2: age | height | weight -->
    <div class="detail-row">
      <CreatureAge />
      <CreatureHeight />
      <CreatureWeight />
    </div>

    <!-- Row 3: race (stub) | land speed -->
    <div class="detail-row row-2">
      <div class="race-stub">
        <span class="detail-label">{{ localize('dnd35e.ACTOR.header.race') }}</span>
        <span class="race-placeholder">{{ localize('dnd35e.ACTOR.header.racePlaceholder') }}</span>
      </div>
      <CreatureLandSpeed />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import {
    CreatureAge,
    CreatureAlignment,
    CreatureDeity,
    CreatureGender,
    CreatureHeight,
    CreatureLandSpeed,
    CreatureWeight,
  } from './header/index.mjs';

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
    grid-column: span 2;

    // ── Compact FormGroup overrides for the header bar ─────────────────────
    :deep(.form-group) {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin: 0;

      // -Hide GM field-controls icons in the compact header context-
      // or not, not sure if those exist anywhere else....
      // TODO: revisit after imlementing attributes tab
      //.controls { display: none; }

      .form-group-label {
        margin: 0;

        label {
          font-weight: bold;
          color: var(--color-text-dark-secondary, #666);
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
      }

      input[type='text'],
      input[type='number'],
      select {
        font-size: 0.75rem;
        height: 1.3em;
        padding: 0 0.1rem;
        width: 100%;
        min-width: 0;
      }
    }
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
    gap: 0.5rem;

    &.row-2 {
      grid-template-columns: 1fr auto;
    }
  }

  .race-stub {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .detail-label {
    font-weight: bold;
    color: var(--color-text-dark-secondary, #666);
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .race-placeholder {
    color: var(--color-text-dark-secondary, #888);
    font-style: italic;
    font-size: 0.75rem;
  }
</style>
