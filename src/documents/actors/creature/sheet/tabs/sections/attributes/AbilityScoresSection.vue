<template>
  <section class="sheet-section ability-scores-section">
    <h2 class="section-header">{{ localize('dnd35e.ACTOR.section.AbilityScores') }}</h2>
    <table class="abilities-table">
      <thead>
        <tr>
          <th class="col-name"></th>
          <th class="col-base">{{ localize('dnd35e.ACTOR.stat.base') }}</th>
          <th class="col-total">{{ localize('dnd35e.ACTOR.stat.total') }}</th>
          <th class="col-mod">{{ localize('dnd35e.ACTOR.stat.mod') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ability in abilities" :key="ability.key" class="ability-row">
          <td class="col-name ability-name">{{ localize(`dnd35e.ABILITY.${ability.key}.abbr`) }}</td>
          <td class="col-base ability-base-cell">
            <NumberFormGroup
              :label="`dnd35e.ABILITY.${ability.key}.abbr`"
              :value="ability.base"
              :field-path="`system.abilities.${ability.key}.base`"
              class="ability-score-input"
              :show-label="false"
            />
          </td>
          <td class="col-total ability-total">{{ ability.base }}</td>
          <td class="col-mod ability-mod" :class="{ positive: ability.mod >= 0, negative: ability.mod < 0 }">
            {{ formatMod(ability.mod) }}
          </td>
        </tr>
      </tbody>
    </table>
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

  .abilities-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;

    thead tr th {
      font-size: 0.6rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-dark-secondary, #666);
      padding: 0.15rem 0.2rem;
      text-align: center;
      border-bottom: 1px solid var(--color-border-light-2, #ccc);
    }

    tbody .ability-row {
      border-bottom: 1px solid var(--color-border-light-tertiary, #e8e8e8);

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 0.1rem 0.2rem;
      vertical-align: middle;
      text-align: center;
    }
  }

  .col-name {
    text-align: left !important;
    width: 2.2rem;
  }

  .ability-name {
    font-weight: bold;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-dark-secondary, #555);
    text-align: left;
    padding-left: 0.25rem !important;
  }

  .ability-score-input {
    :deep(input) {
      text-align: center;
      font-size: 0.85rem;
      font-weight: bold;
      height: 1.4rem;
      padding: 0;
      width: 2.5rem;
    }
    :deep(.form-group-label) {
      display: none;
    }
  }

  .ability-total {
    color: var(--color-text-dark-secondary, #555);
  }

  .ability-mod {
    font-weight: bold;
    font-size: 0.85rem;

    &.positive { color: var(--color-level-success, #2d8a2d); }
    &.negative { color: var(--color-level-error, #a30000); }
  }
</style>

