<template>
  <IdentifiableDetails>
    <ItemPrice />
    <div class="weapon-details-container">
      <ItemQuantity />
      <ItemWeight />
      <ItemUnidentifiedPrice />
      <ItemHP />
      <ItemHardness />
      <ItemSheetContainerSelector />
      <ItemIsWeightlessWhenEquipped />
      <ItemSheetIsCarriedCheckbox />

      <!-- <FormGroup
        label="D35E.Hardness"
        type="text"
        :value="bonusHardness"
        :editable="isEditable"
        :onUpdate="getFieldUpdater('system.bonusHardness')"
      /> -->

    </div>
  </IdentifiableDetails>
</template>
<script setup lang="ts">
  import { IdentifiableDetails, ItemUnidentifiedPrice } from '@ec/Identifiable/index.mjs';
  import { ItemIsWeightlessWhenEquipped } from '@items/components/Equippable/index.mjs';
  import {
    ItemHardness,
    ItemHP,
    ItemPrice,
    ItemQuantity,
    ItemSheetContainerSelector,
    ItemSheetIsCarriedCheckbox,
    ItemWeight,
  } from '@items/components/Physical/index.mjs';
</script>
<style scoped lang="scss">
  .weapon-details-container {
    grid-column: span 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.33rem;

    :deep(.form-group) {
      border: 1px solid var(--color-border-light-tertiary, #7a7971);
      display: grid;
      grid-auto-flow: column;
      align-items: anchor-center;
      grid-gap: 0.33rem;
      padding: 0.25rem;
    }

    :deep(.form-group input) {
      max-width: 50px;
    }
  }
</style>
