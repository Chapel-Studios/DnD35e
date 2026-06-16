<template>
  <FormGroupSection
    label="dnd35e.CREATURE.FIELDS.abilities.label"
    field-path="system.abilities"
    :default-visibility="ownerPlusVisibility"
    :default-editability="gmOnlyEditability"
    class="ability-scores-section"
  >
    <div class="ability-cards">
      <div v-for="ability in abilities" :key="ability.key" class="ability-card">
        <div class="ability-card-mod" :class="ability.class">
          {{ ability.mod }}
        </div>
        <div class="ability-card-base">
          <NumberFormGroup
            :label="`dnd35e.ABILITY.${ability.key}.abbr`"
            :value="ability.base"
            :field-path="`system.abilities.${ability.key}.base`"
            class="ability-base-input contents"
          />
        </div>
      </div>
    </div>
  </FormGroupSection>
</template>

<script setup lang="ts">
  import { ABILITY_KEYS_LOCALIZED } from '@constants/abilities.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { FormGroupSection, NumberFormGroup } from '@vc/fields/index.mjs';
  import { gmOnlyEditability, ownerPlusVisibility } from '@vc/fields/index.mjs';
  import { computed, inject } from 'vue';

  import type { CreatureDocumentStore } from '../CreatureStore.mjs';

  const {
    documentGetters: { getViewAwareFieldValue },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const localize = (key: string) => game.i18n.localize(key);
  const formatMod = (mod: number): string => (mod >= 0 ? `+${mod}` : `${mod}`);

  const abilities = computed(() =>
    Object.entries(ABILITY_KEYS_LOCALIZED).map(([key, label]) => {
      const modValue = getViewAwareFieldValue<number>(`system.abilities.${key}.mod`)  ?? 0;
      
      return ({
        key,
        label,
        base: getViewAwareFieldValue<number>(`system.abilities.${key}.base`) ?? 10,
        mod:  formatMod(modValue),
        class: {
          positive: modValue >= 0,
          negative: modValue < 0,
        },
        abbr: localize(`dnd35e.ABILITY.${key}.abbr`),
      });
    })
  );

</script>

<style lang="scss" scoped>
  .ability-scores-section {
    padding: 0.25rem;
    position: relative;
  }

  .ability-cards {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.3rem;
    justify-self: stretch;
    justify-content: space-around;
    justify-items: center;
  }

  .ability-card {
    display: grid;
    grid-template-areas:
      "label"
      "mod"
      "stat";
    grid-template-rows: auto auto auto;
    align-items: center;
    justify-items: center;
    justify-content: center;
    gap: 0.1rem;
    border: 1px solid var(--color-tabs-border);
    border-radius: 4px;
    padding: 0.35rem 0.2rem 0.25rem;
    min-width: 3.75rem;
    position: relative;
  }

  .ability-card-mod {
    font-size: 1.2rem;
    font-weight: bold;
    line-height: 1;
    grid-area: mod;

    // &.positive { color: var(--color-level-success, #2d8a2d); }
    &.negative { color: var(--color-level-error, #a30000); }
  }

  .ability-card-base {
    display: contents;

    :deep(input) {  
      text-align: center;
      font-size: 1rem;
      height: 1.4rem;
      padding: 0;
      width: 2.5rem;
      grid-area: stat;
    }

    :deep(.form-group-label) {
      grid-area: label;
      font-size: 1.25rem;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: grid;
      justify-items: center;
      grid-gap: 0;
    }

    :deep(.form-group) {
      margin: 0;
      justify-content: center;
    }
  }


</style>
