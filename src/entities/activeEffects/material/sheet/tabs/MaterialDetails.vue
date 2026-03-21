<template>
  <EffectDetails class="material-details">
    <template #append>
      <ItemHardness direct-update />
      <!-- HP per Inch -->
      <NumberFormGroup
        label="D35E.HpPerInch"
        :value="bonusHp"
        field-path="system.bonusHp"
        direct-update
      />
      <!-- Magic Equivalent -->
      <NumberFormGroup
        label="D35E.MagicEquivalent"
        :value="magicEquivalent"
        field-path="system.magicEquivalent"
        direct-update
      />
      <DamageReductionTypes class="grid-full-row" />
    </template>
    <template #outer-append>
      <div class="material-details-container grid-full-row">
        <!-- Material Equivalents -->
        <!-- <DamageReductionTypes /> -->
        <!-- Magic Equivalent -->
        <!-- 
        <h3 class="form-header">{{ localize("D35E.MagicEquivalent") }}</h3>

        <NumberFormGroup
          label="D35E.MagicEquivalent"
          :value="magicEquivalent"
          field-path="system.magicEquivalent"
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
  import DamageReductionTypes from '@effects/BaseActiveEffect/sheet/components/DamageReductionTypes.vue';
  import { ItemHardness } from '@items/components/Physical/index.mjs';
  import { NumberFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  import { MaterialStore } from '../MaterialStore.mjs';

  const {
    documentGetters: {
      bonusHp,
      magicEquivalent,
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
