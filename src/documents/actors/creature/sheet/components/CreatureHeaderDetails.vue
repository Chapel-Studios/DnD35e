<template>
  <div class="creature-header-details">
    <!-- XP bar (stub) + Rest button -->
    <div class="xp-row">
      <span class="xp-label">{{ localize('dnd35e.ACTOR.header.xp') }}</span>
      <div class="xp-bar-wrap">
        <div class="xp-bar" :style="{ width: '0%' }"></div>
      </div>
      <span class="xp-value">0 / 0</span>
      <button
        type="button"
        class="rest-btn field-control-btn"
        :title="localize('dnd35e.ACTOR.action.rest')"
      >
        <i class="fas fa-campground" />
      </button>
    </div>

    <!-- Stat pills: HP | AC | Fort | Ref | Will -->
    <div class="stat-pills">
      <div class="pill hp-pill">
        <span class="pill-label">{{ localize('dnd35e.ACTOR.stat.hp') }}</span>
        <span class="pill-value">{{ hpCurrent }} / {{ hpMax }}</span>
      </div>
      <div class="pill">
        <span class="pill-label">{{ localize('dnd35e.ACTOR.stat.ac') }}</span>
        <span class="pill-value">{{ acNormal }}</span>
      </div>
      <div class="pill">
        <span class="pill-label">{{ localize('dnd35e.ACTOR.stat.fort') }}</span>
        <span class="pill-value">{{ formatBonus(fortTotal) }}</span>
      </div>
      <div class="pill">
        <span class="pill-label">{{ localize('dnd35e.ACTOR.stat.ref') }}</span>
        <span class="pill-value">{{ formatBonus(refTotal) }}</span>
      </div>
      <div class="pill">
        <span class="pill-label">{{ localize('dnd35e.ACTOR.stat.will') }}</span>
        <span class="pill-value">{{ formatBonus(willTotal) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { computed, inject } from 'vue';

  const localize = (key: string) => game.i18n.localize(key);
  const formatBonus = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  const { documentGetters: { getViewAwareFieldValue } } =
    inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const hpCurrent = computed(() => getViewAwareFieldValue<number>('system.hp.current') ?? 0);
  const hpMax     = computed(() => getViewAwareFieldValue<number>('system.hp.max')     ?? 0);
  const acNormal  = computed(() => getViewAwareFieldValue<number>('system.ac.normal')  ?? 10);
  const fortTotal = computed(() => getViewAwareFieldValue<number>('system.saves.fort.total') ?? 0);
  const refTotal  = computed(() => getViewAwareFieldValue<number>('system.saves.ref.total')  ?? 0);
  const willTotal = computed(() => getViewAwareFieldValue<number>('system.saves.will.total') ?? 0);
</script>

<style lang="scss" scoped>
  .creature-header-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem 0.4rem;
    border-bottom: 1px solid var(--color-border-light-2, #ccc);
    background: var(--color-bg-option, rgba(0, 0, 0, 0.03));
    font-size: 0.75rem;
    grid-column: span 2;
  }

  // ── XP row ────────────────────────────────────────────────────────────────

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

  .rest-btn {
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  // ── Stat pills ────────────────────────────────────────────────────────────

  .stat-pills {
    display: flex;
    gap: 0.3rem;
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
