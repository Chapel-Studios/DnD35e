<template>
  <section class="sheet-section ability-scores-section">
    <h2 class="section-header">{{ localize('dnd35e.ACTOR.section.AbilityScores') }}</h2>
    <div class="ability-cards">
      <div v-for="ability in abilities" :key="ability.key" class="ability-card">
        <div class="ability-card-name">{{ localize(`dnd35e.ABILITY.${ability.key}.abbr`) }}</div>
        <div class="ability-card-mod" :class="{ positive: ability.mod >= 0, negative: ability.mod < 0 }">
          {{ formatMod(ability.mod) }}
        </div>
        <div class="ability-card-base">
          <NumberFormGroup
            :label="`dnd35e.ABILITY.${ability.key}.abbr`"
            :value="ability.base"
            :field-path="`system.abilities.${ability.key}.base`"
            class="ability-base-input"
            :show-label="false"
          />
        </div>
        <button type="button" class="field-control-btn ability-overflow-btn" title="Modifiers">
          <i class="fas fa-ellipsis" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

  const localize = (key: string) => game.i18n.localize(key);

  const {
    documentGetters: { getViewAwareFieldValue },
  } = inject(DocumentSheetStoreSymbol) as DocumentSheetStore;

  const abilities = computed(() =>
    ABILITY_KEYS.map((key) => ({
      key,
      base: (getViewAwareFieldValue<number>(`system.abilities.${key}.base`) ?? 10) as number,
      mod:  (getViewAwareFieldValue<number>(`system.abilities.${key}.mod`)  ?? 0)  as number,
    }))
  );

  const formatMod = (mod: number): string => (mod >= 0 ? `+${mod}` : `${mod}`);
</script>

<style lang="scss" scoped>
  .ability-scores-section {
    padding: 0.25rem;
  }

  .ability-cards {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.3rem;
  }

  .ability-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    background: var(--color-bg-option, #f4f0ec);
    border: 1px solid var(--color-border-light-2, #ccc);
    border-radius: 4px;
    padding: 0.35rem 0.2rem 0.25rem;
    min-width: 0;
    position: relative;
  }

  .ability-card-name {
    font-size: 0.6rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-dark-secondary, #555);
  }

  .ability-card-mod {
    font-size: 1.2rem;
    font-weight: bold;
    line-height: 1;

    // &.positive { color: var(--color-level-success, #2d8a2d); }
    &.negative { color: var(--color-level-error, #a30000); }
  }

  .ability-base-input {
    :deep(input) {
      text-align: center;
      font-size: 0.8rem;
      height: 1.4rem;
      padding: 0;
      width: 2.5rem;
    }

    :deep(.form-group-label) {
      display: none;
    }

    :deep(.form-group) {
      margin: 0;
      justify-content: center;
    }
  }

  .ability-overflow-btn {
    position: absolute;
    top: 0.1rem;
    right: 0.1rem;
    font-size: 0.55rem;
    padding: 0.05rem 0.1rem;
    opacity: 0.3;

    &:hover {
      opacity: 0.7;
    }
  }
</style>

