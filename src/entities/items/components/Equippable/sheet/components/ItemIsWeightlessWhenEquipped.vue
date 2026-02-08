<template>
  <FormGroup
    :editable="isEditable"
    label="Is Weightless When Equipped"
    :value="isWeightlessWhenEquipped"
    @update="updater"
    type="checkbox"
  />
</template>
<script setup lang="ts">
  import { FormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';
  import { EquippableItemStore } from '@items/components/Equippable/index.mjs';

  const {
    isEditable,
    equippableGetters: {
      isWeightlessWhenEquipped,
    },
    documentActions: {
      getFieldUpdater,
    },
  } = inject('itemSheetStore') as EquippableItemStore;

  const updater = getFieldUpdater('system.isWeightlessWhenEquipped');
</script>
