<template>
  <DocumentDetails>
    <div class="weapon-details-container">
      <ItemPrice />
      <ItemHP />
      <ItemQuantity />
      <EquippableItemWeight />
      <ItemSize class="span-2" />
      <ItemHardness />
      <DesignedForSize class="span-2" />
      <ItemSheetIsCarriedCheckbox />
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
  import { DocumentDetails, DocumentSheetStoreSymbol } from '@ec/CoreMixin/index.mjs';
  import DamageReductionTypes from '@effects/material/sheet/components/DamageReductionTypes.vue';
  import MagicEquivalency from '@effects/material/sheet/components/MagicEquivalency.vue';
  import { DesignedForSize, EquippableItemWeight } from '@items/components/Equippable/index.mjs';
  import {
    ItemHardness,
    ItemHP,
    ItemPrice,
    ItemQuantity,
    ItemSheetContainerSelector,
    ItemSheetIsCarriedCheckbox,
    ItemSize,
  } from '@items/components/Physical/index.mjs';
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
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.66rem 0.5rem;

    :deep(.form-group),
    :deep(.form-group-section) {
      border: 1px solid var(--color-border, #7a7971);
      display: grid;
      grid-auto-flow: column;
      align-items: center;
      grid-gap: 0.33rem;
    }

    :deep(.form-group.item-price.price-form-group) {
      grid-auto-flow: row;
      justify-items: center;
    }

    :deep(.form-group-section) {
      position: relative;
    }

    :deep(.form-group-label) {
      flex-direction: column;
      text-align: center;
    }

    :deep(.form-group input) {
      max-width: 50px;
      text-align: right;
    }

    :deep(.multi-select-form-group.form-group) {
      grid-auto-flow: row;

      .form-group-label {
        flex-direction: row;
      }
    }
  }
  
  .span-2 {
    grid-column: span 2;
  }
</style>
