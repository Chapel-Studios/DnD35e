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
  import { inject } from 'vue';
  import { WeaponStore } from './WeaponStore.mjs';
  import {
    ItemQuantity,
    ItemWeight,
    ItemPrice,
    ItemHP,
    ItemHardness,
    ItemSheetContainerSelector,
    ItemSheetIsCarriedCheckbox,
  } from '@items/components/Physical/index.mjs';
  import { ItemUnidentifiedPrice } from '@items/components/Identifiable/index.mjs';
  import { ItemIsWeightlessWhenEquipped } from '@items/components/Equippable/index.mjs';

  const {
    tabs: {
      tabGetters: { getIsTabOpen },
    },
  } = inject('itemSheetStore') as WeaponStore;

  const tabName = 'weapon-details';
  const isActiveTab = getIsTabOpen(tabName);
</script>
