<template>
  <div class="class-and-race">
    <span class="race">{{ race }}</span>
    <span class="class">{{ classShorthand }}</span>

    <!-- XP bar -->
    <div class="xp-bar-row">
      <span class="xp-label">{{ localize('dnd35e.ACTOR.header.xp') }}</span>
      <div class="xp-bar-wrap">
        <div class="xp-bar" :style="{ width: '0%' }"></div>
      </div>
      <span class="xp-value">0 / 0</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { inject } from 'vue';

  import type { CharacterStore } from '../CharacterStore.mjs';

  const localize = (key: string) => game.i18n.localize(key);
  const store = inject(DocumentSheetStoreSymbol) as CharacterStore;
  const { classShorthand, race } = store.documentGetters;
</script>

<style scoped lang="scss">
  .class-and-race {
    font-size: 1.25rem;
    display: grid;
    grid-auto-flow: column;
    justify-content: space-evenly;
    gap: 0.5em;
    grid-column: span 2;
    grid-template-columns:
      min-content          /* 1: fixed text, never grows */
      max-content          /* 2: grows to fit class levels */
      minmax(120px, 1fr)   /* 3: XP bar, minimum width but fills leftover space */
      min-content;         /* 4: XP number */
    align-items: center;
  }

  .class {
    font-weight: bold;
  }

  .race {
    font-style: italic;
  }
  // ── XP row ────────────────────────────────────────────────────────────────

  .xp-bar-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    grid-column: span 2;
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
</style>