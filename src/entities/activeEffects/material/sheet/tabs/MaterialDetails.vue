<template>
  <EffectDetails class="material-details">
    <template #append>
      <ItemHardness direct-update />
      <!-- HP per Inch -->
      <NumberFormGroup
        label="D35E.bonusHp"
        :value="bonusHp"
        field-path="system.bonusHp"
        direct-update
      />
      <MagicEquivalency />
      <DamageReductionTypes />
      <ItemPrice />
    </template>
    <template #outer-append>
      <div class="material-details-container grid-full-row">
        <!-- 
        <h3 class="form-header">{{ localize("D35E.MagicEquivalent") }}</h3>

        <NumberFormGroup
          label="D35E.MagicEquivalent"
          :value="magicEquivalency"
          field-path="system.magicEquivalency"
          direct-update
        />

        <span class="notes">
          <em>{{ localize("D35E.MagicEquivalentDescription") }}</em>
        </span>
        -->
      </div>

      <!-- Hardness -->
      <!--
      <NumberFormGroup
        label="D35E.Hardness"
        :value="bonusHardness"
        field-path="system.bonusHardness"
        direct-update
      /> -->

      <!-- <NumberFormGroup
        label="D35E.HpPerInch"
        :value="bonusHpPerInch"
        field-path="system.bonusHpPerInch"
        direct-update
      />
      -->

      <!--
      <h3 class="form-header">{{ localize("D35E.MagicEquivalent") }}</h3>



      <span class="notes">
        <em>{{ localize("D35E.MagicEquivalentDescription") }}</em>
      </span>
      -->

      <!-- GM‑Only Section -->
      <!-- <template v-if="userIsGM">
        <h3 class="form-header">{{ localize("D35E.SystemProperties") }}</h3>
        <UniqueId />
      </template> -->
    </template>
  </EffectDetails>
</template>

<script setup lang="ts">
  import { EffectDetails } from '@effects/BaseActiveEffect/index.mjs';
  import { ItemHardness } from '@items/components/Physical/index.mjs';
  import ItemPrice from '@items/components/Physical/sheet/components/ItemPrice.vue';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  import DamageReductionTypes from '../components/DamageReductionTypes.vue';
  import MagicEquivalency from '../components/MagicEquivalency.vue';
  import { MaterialStore } from '../MaterialStore.mjs';

  const {
    documentGetters: {
      bonusHp,
    },
  } = inject('documentSheetStore') as MaterialStore;
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

  .form-group {
    display: contents;
  }
</style>
