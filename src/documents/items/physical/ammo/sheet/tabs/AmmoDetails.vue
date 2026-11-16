<template>
  <DocumentDetails>
    <div class="ammo-details-container">
      <ItemPrice />
      <ItemHP />
      <ItemQuantity />
      <ItemWeight />
      <ItemSize />
      <ItemHardness />
      <ItemSheetIsCarriedCheckbox />
      <ItemSheetIsBrokenCheckbox />
      <ItemSheetContainerSelector />
      <AmmoType />
      <CheckBoxFormGroup
        field-path="system.isAlwaysRecoverable"
      />
    </div>
  </DocumentDetails>
</template>

<script setup lang="ts">
  import DocumentDetails from '@documents/document/sheet/tabs/DocumentDetails.vue';
  import {
    ItemHardness,
    ItemHP,
    ItemPrice,
    ItemQuantity,
    ItemSheetContainerSelector,
    ItemSheetIsBrokenCheckbox,
    ItemSheetIsCarriedCheckbox,
    ItemSize,
    ItemWeight,
  } from '@items/physical/physicalItem/sheet/index.mjs';
  import { CheckBoxFormGroup } from '@vc/fields/index.mjs';

  import AmmoType from '../components/AmmoType.vue';
</script>

<style lang="scss" scoped>
  .view-mode {
    .ammo-details-container {
      :deep(.form-group-label) {
        flex-direction: row;
      }
    }
  }

  .ammo-details-container {
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
</style>