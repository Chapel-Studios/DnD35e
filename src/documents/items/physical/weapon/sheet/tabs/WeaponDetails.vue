<template>
  <DocumentDetails>
    <div class="weapon-details-container">
      <ItemPrice />
      <ItemHP />
      <ItemQuantity />
      <EquippableItemWeight />
      <ItemSize />
      <ItemHardness />
      <DesignedForSize   />
      <ItemSheetIsCarriedCheckbox />
      <ItemSheetIsBrokenCheckbox />
      <ItemIsMasterworkCheckbox />
      <ItemSheetContainerSelector />
      <MagicEquivalency v-if="hasMagicEquivalentEffects" class="magic-eq-effect" read-only />
      <DamageReductionTypes v-if="hasDamageReductionTypeEffects" class="dr-types" read-only />
    </div>
    <DmControl class="grid-full-row">
      <UniqueId />        
    </DmControl>
  </DocumentDetails>
</template>

<script setup lang="ts">
  import { DocumentDetails, DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import DamageReductionTypes from '@effects/material/sheet/components/DamageReductionTypes.vue';
  import MagicEquivalency from '@effects/material/sheet/components/MagicEquivalency.vue';
  import { DesignedForSize, EquippableItemWeight, ItemIsMasterworkCheckbox } from '@items/physical/equippableItem/index.mjs';
  import {
    ItemHardness,
    ItemHP,
    ItemPrice,
    ItemQuantity,
    ItemSheetContainerSelector,
    ItemSheetIsBrokenCheckbox,
    ItemSheetIsCarriedCheckbox,
    ItemSize,
  } from '@items/physical/physicalItem/sheet/index.mjs';
  import { DmControl, UniqueId } from '@vc/index.mjs';
  import { inject } from 'vue';

  import type { WeaponStore } from '../WeaponStore.mjs';

  const {
    documentGetters: { hasEffectsForField },
  } = inject(DocumentSheetStoreSymbol) as WeaponStore;

  const hasMagicEquivalentEffects = hasEffectsForField('system.magicEquivalency');
  const hasDamageReductionTypeEffects = hasEffectsForField('system.damageReductionTypes');
</script>

<style scoped lang="scss">
  .view-mode {
    .weapon-details-container {
      :deep(.form-group-label) {
        flex-direction: row;
      }
    }
  }

  .magic-eq-effect {
    grid-column: span 2;
  }

  .weapon-details-container {
    grid-column: span 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
    gap: 0.66rem 0.5rem;

    :deep(.form-group.item-price.price-form-group) {
      grid-auto-flow: row;
      justify-items: center;
    }

    :deep(.form-group-section) {
      position: relative;
    }

    :deep(.form-group) {
      grid-auto-flow: row;
    }

    :deep(.form-group input) {
      text-align: right;
    }

    :deep(.multi-select-form-group.form-group) {
      grid-auto-flow: row;

      .form-group-label {
        flex-direction: row;
      }
    }

    :deep(.coinage-form-group) {
      grid-auto-flow: row;
      justify-items: center;
      margin-top: 0;
    }
  }
  
  .span-2 {
    grid-column: span 2;
  }
</style>
