<template>
  <div class="actor-tab abilities-tab">
    <div class="abilities-grid">
      <div v-for="ability in abilities" :key="ability.key" class="ability-entry">
        <NumberFormGroup
          :label="`dnd35e.ABILITY.${ability.key}.abbr`"
          :value="ability.base"
          :field-path="`system.abilities.${ability.key}.base`"
          class="ability-score-group"
        />
        <div class="ability-mod">{{ formatMod(ability.mod) }}</div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import type { DocumentSheetStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

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
  .abilities-tab {
    padding: 0.5rem;
  }

  .abilities-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .ability-entry {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;

    .ability-score-group {
      width: 100%;
    }

    .ability-mod {
      font-size: 1.1rem;
      font-weight: bold;
      text-align: center;
      margin-top: 0.25rem;
    }
  }
</style>

