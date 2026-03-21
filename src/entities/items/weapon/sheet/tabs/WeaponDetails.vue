<template>
  <DocumentDetails>
    <div class="weapon-details-container">
      <ItemPrice class="grid-full-row" />
      <ItemHP />
      <ItemQuantity />
      <EquippableItemWeight />
      <ItemHardness />
      <ItemSheetIsCarriedCheckbox />
      <ItemSheetContainerSelector />
    </div>
    <DmControl class="grid-full-row">
      <UniqueId />        
    </DmControl>
  </DocumentDetails>
</template>
<script setup lang="ts">
  import { DocumentDetails } from '@ec/CoreMixin/index.mjs';
  import { EquippableItemWeight } from '@items/components/Equippable/index.mjs';
  import {
    ItemHardness,
    ItemHP,
    ItemPrice,
    ItemQuantity,
    ItemSheetContainerSelector,
    ItemSheetIsCarriedCheckbox,
  } from '@items/components/Physical/index.mjs';
  import { DmControl, UniqueId } from '@vc/index.mjs';
</script>
<style scoped lang="scss">
  .view-mode {
    .weapon-details-container {
      :deep(.form-group-label) {
        flex-direction: row;
      }
    }
  }
  .weapon-details-container {
    grid-column: span 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.33rem;

    :deep(.form-group) {
      border: 1px solid var(--color-border, #7a7971);
      display: grid;
      grid-auto-flow: column;
      align-items: center;
      grid-gap: 0.33rem;
      padding: 0.25rem;
    }
    :deep(.form-group-label) {
      flex-direction: column;
    }

    :deep(.form-group input) {
      max-width: 50px;
      text-align: right;
    }
  }
</style>
