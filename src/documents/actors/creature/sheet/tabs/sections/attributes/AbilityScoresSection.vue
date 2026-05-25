<template>
  <section class="sheet-section ability-scores-section">
    <h2 class="section-header">Ability Scores</h2>
    <div class="abilities-strip">
      <div v-for="ability in abilities" :key="ability.key" class="ability-box">
        <div class="ability-abbr">{{ localize(`dnd35e.ABILITY.${ability.key}.abbr`) }}</div>
        <NumberFormGroup
          :label="`dnd35e.ABILITY.${ability.key}.abbr`"
          :value="ability.base"
          :field-path="`system.abilities.${ability.key}.base`"
          class="ability-score-input"
          :show-label="false"
        />
        <div class="ability-mod" :class="{ positive: ability.mod >= 0, negative: ability.mod < 0 }">
          {{ formatMod(ability.mod) }}
        </div>
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
    .abilities-strip {
      display: flex;
      gap: 0.25rem;
      flex-wrap: nowrap;
    }

    .ability-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--color-bg-option, rgba(0,0,0,0.05));
      border: 1px solid var(--color-border-light-2, #ccc);
      border-radius: 3px;
      padding: 0.2rem 0.25rem;
      min-width: 52px;
      flex: 1;
    }

    .ability-abbr {
      font-size: 0.6rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-dark-secondary, #666);
      margin-bottom: 0.1rem;
    }

    .ability-score-input {
      width: 100%;
      :deep(input) {
        text-align: center;
        font-size: 0.95rem;
        font-weight: bold;
        height: 1.6rem;
        padding: 0;
      }
      :deep(.form-group-label) {
        display: none;
      }
    }

    .ability-mod {
      font-size: 0.7rem;
      font-weight: bold;
      margin-top: 0.1rem;

      &.positive { color: var(--color-level-success, #2d8a2d); }
      &.negative { color: var(--color-level-error, #a30000); }
    }
  }
</style>
