<template>
  <EffectDetails class="material-details">
    <template #append>
      <ItemHardness />
      <!-- HP per Inch -->
      <NumberFormGroup
        :value="bonusHp"
        field-path="system.bonusHp"
      />
      <MagicEquivalency />
      <ItemPrice />
    </template>
    <template #outer-append>
      <DamageReductionTypes />
      <div class="material-details-container grid-full-row">
        <!-- 
        <h3 class="form-header">{{ localize("dnd35e.ITEM.MagicEquivalent") }}</h3>

        <NumberFormGroup
          label="dnd35e.ITEM.MagicEquivalent"
          :value="magicEquivalency"
          field-path="system.magicEquivalency"
          direct-update
        />

        <span class="notes">
          <em>{{ localize("dnd35e.ITEM.MagicEquivalentDescription") }}</em>
        </span>
        -->
      </div>

      <!-- Hardness -->
      <!--
      <NumberFormGroup
        label="dnd35e.ITEM.Hardness"
        :value="bonusHardness"
        field-path="system.bonusHardness"
        direct-update
      /> -->

      <!-- <NumberFormGroup
        label="dnd35e.ITEM.BonusHp"
        :value="bonusHp"
        field-path="system.bonusHp"
        direct-update
      />
      -->

      <!--
      <h3 class="form-header">{{ localize("dnd35e.ITEM.MagicEquivalent") }}</h3>



      <span class="notes">
        <em>{{ localize("dnd35e.ITEM.MagicEquivalentDescription") }}</em>
      </span>
      -->

      <!-- GM‑Only Section -->
      <!-- <template v-if="userIsGM">
        <h3 class="form-header">{{ localize("dnd35e.COMMON.SystemProperties") }}</h3>
        <UniqueId />
      </template> -->
    </template>
  </EffectDetails>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import EffectDetails from '@effects/baseActiveEffect/sheet/tabs/EffectDetails.vue';
  import ItemPrice from '@items/physical/physicalItem/sheet/components/ItemPrice.vue';
  import { ItemHardness } from '@items/physical/physicalItem/sheet/index.mjs';
  import { NumberFormGroup } from '@vc/fields/index.mjs';
  import { inject } from 'vue';

  import DamageReductionTypes from '../components/DamageReductionTypes.vue';
  import MagicEquivalency from '../components/MagicEquivalency.vue';
  import type { MaterialStore } from '../MaterialStore.mjs';

  const {
    documentGetters: {
      bonusHp,
    },
  } = inject(DocumentSheetStoreSymbol) as MaterialStore;
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
