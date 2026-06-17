<template>
  <div class="creature-header-details">
    <!-- Stat pills: HP | AC | Fort | Ref | Will -->
    <AbilityScores />
    <div class="defense-shields">
      <CreatureAC />
      <CreatureDefenseStat fieldPath="system.saves.fort.total" />
      <CreatureDefenseStat fieldPath="system.saves.ref.total" />
      <CreatureDefenseStat fieldPath="system.saves.will.total" />
    </div>
    <slot />
  </div>
</template>

<script lang="ts" setup>
  import AbilityScores from './AbilityScores.vue';
  import CreatureAC from './CreatureAC.vue';
  import CreatureDefenseStat from './CreatureDefenseStat.vue';
</script>

<style lang="scss" scoped>
  .creature-header-details {
    display: grid;
    grid-template-columns: 1fr min-content;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem 0.4rem;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
    font-size: 0.75rem;
    grid-column: span 2;
  }
  
  // ── Stat pills ────────────────────────────────────────────────────────────

  .defense-shields {
    display: grid;
    grid-auto-flow: column;
    gap: 0.3rem;
    align-items: center;
  }

  .pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1 1 0;
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 3px;
    padding: 0.15rem 0.2rem;
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
    min-width: 0;

    &.hp-pill { flex: 1.6 1 0; }
  }

  .pill-label {
    font-size: 0.6rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #666);
    white-space: nowrap;
  }

  .pill-value {
    font-size: 0.85rem;
    font-weight: bold;
    color: var(--color-text-dark-primary, #191813);
    white-space: nowrap;
  }
</style>
