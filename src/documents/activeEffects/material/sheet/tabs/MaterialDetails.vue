<template>
  <EffectDetails class="material-details">
    <template #append>
      <ItemHardness />
      <!-- HP per Inch -->
      <NumberFormGroup
        field-path="system.bonusHp"
      />
      <MagicEquivalency />
      <ItemPrice />
    </template>
    <template #outer-append>
      <DamageReductionTypes />
      <div class="material-details-container grid-full-row">
      </div>
    </template>
  </EffectDetails>
</template>

<script setup lang="ts">
  import EffectDetails from '@effects/baseActiveEffect/sheet/tabs/EffectDetails.vue';
  import ItemPrice from '@items/physical/physicalItem/sheet/components/ItemPrice.vue';
  import { ItemHardness } from '@items/physical/physicalItem/sheet/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';

  import DamageReductionTypes from '../components/DamageReductionTypes.vue';
  import MagicEquivalency from '../components/MagicEquivalency.vue';
</script>

<style scoped>
  .form-container {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 1rem 3rem;
    align-items: center;
  }

  .form-header {
    grid-column: span 2;
    margin: 1rem 0 0.25rem;
    text-decoration: underline;
  }

  .notes {
    margin: -0.75rem 0 0.125rem;
    grid-column: span 2;
  }
</style>
