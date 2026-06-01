<template>
  <section class="sheet-section speed-section">
    <h2 class="section-header">{{ localize('dnd35e.ACTOR.section.Speed') }}</h2>
    <div class="speed-cards">
      <div class="speed-card">
        <div class="speed-value">{{ landSpeed }}&thinsp;ft</div>
        <div class="speed-label">{{ localize('dnd35e.ACTOR.speed.land') }}</div>
      </div>
      <div v-for="mode in otherModes" :key="mode.key" class="speed-card stub">
        <div class="speed-value placeholder">—</div>
        <div class="speed-label">{{ localize(mode.label) }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { ActorDocumentStore } from '@actors/baseActor/sheet/ActorSheetStore.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { inject } from 'vue';

  const localize = (key: string) => game.i18n.localize(key);

  const {
    documentGetters: { landSpeedTotal },
  } = inject(DocumentSheetStoreSymbol) as ActorDocumentStore;

  const landSpeed = landSpeedTotal;

  const otherModes = [
    { key: 'climb', label: 'dnd35e.ACTOR.speed.climb' },
    { key: 'swim',  label: 'dnd35e.ACTOR.speed.swim' },
    { key: 'fly',   label: 'dnd35e.ACTOR.speed.fly' },
    { key: 'burrow', label: 'dnd35e.ACTOR.speed.burrow' },
  ] as const;
</script>

<style lang="scss" scoped>
  .speed-section {
    padding: 0.25rem;
  }

  .speed-cards {
    display: flex;
    gap: 0.3rem;
  }

  .speed-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--color-bg-option, #f4f0ec);
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 4px;
    padding: 0.3rem 0.5rem;
    min-width: 3.5rem;
    text-align: center;

    &.stub {
      opacity: 0.5;
    }
  }

  .speed-value {
    font-size: 1rem;
    font-weight: bold;
    line-height: 1;

    &.placeholder {
      color: var(--color-text-dark-secondary, #888);
    }
  }

  .speed-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #666);
    margin-top: 0.1rem;
  }
</style>
