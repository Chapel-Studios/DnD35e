<template>
  <SheetSection
    header="dnd35e.ACTOR.section.c-attributes"
    class="traits-section"
  >
    <template #list>
      <DamageReductionTypes v-if="hasDamageReductionTypeEffects" read-only />
      <!-- TODO: this needs energy/condition resistance/immunity,  -->
    </template>
    <template #grid>
      <NumberFormGroup
        field-path="system.init.total"
        read-only
      />
      <NumberFormGroup
        field-path="system.bab.total"
        read-only
      />
      <SpellResistance class="sr" />
      <AooPerRound />
      <NaturalArmor />
      <FastHealing />
      <Regeneration />
      <Concealment />
      <Fortification />
    </template>
  </SheetSection>
</template>

<script setup lang="ts">
  import AooPerRound from '@actors/creature/sheet/components/AooPerRound.vue';
  import Concealment from '@actors/creature/sheet/components/Concealment.vue';
  import FastHealing from '@actors/creature/sheet/components/FastHealing.vue';
  import Fortification from '@actors/creature/sheet/components/Fortification.vue';
  import NaturalArmor from '@actors/creature/sheet/components/NaturalArmor.vue';
  import Regeneration from '@actors/creature/sheet/components/Regeneration.vue';
  import SpellResistance from '@actors/creature/sheet/components/SpellResistance.vue';
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { DamageReductionTypes } from '@effects/material/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import SheetSection from '../SheetSection.vue';
  
  const {
    documentGetters: { hasEffectsForField },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const hasDamageReductionTypeEffects = hasEffectsForField('system.damageReductionTypes');
</script>

<style lang="scss" scoped>
  .traits-section {
    .sr {
      grid-column: span 2;
    }
  }
</style>
