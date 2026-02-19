<template>
  <section
    class="flexcol material-details"
    v-show="isActiveTab"
    data-group="primary"
    :data-tab="tabName"
  >
    <div class="form-container">
      <ItemQuantity />
      <ItemWeight />
      <ItemPrice />
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
  </section>
</template>
<script setup lang="ts">
  import { ItemUnidentifiedPrice } from '@ec/Identifiable/index.mjs';
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
  import { inject } from 'vue';

  import { WeaponStore } from '../WeaponStore.mjs';

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
  } = inject('documentSheetStore') as WeaponStore;

  const tabName = 'weapon-details';
  const isActiveTab = getIsTabOpen(tabName);
</script>
