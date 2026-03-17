<template>
  <MultiSelectFormGroup
    label="Equipped Slots"
    :value="equippedSlotIds"
    :on-update="updater"
    :options="EQUIP_SLOT_SELECT_OPTIONS"
    field-path="system.equippedSlotIds"
  />
</template>
<script setup lang="ts">
  import { EQUIP_SLOT_SELECT_OPTIONS } from '@constants/equipmentSlots.mjs';
  import { EquippableDocumentStore } from '@items/components/Equippable/index.mjs';
  import { MultiSelectFormGroup } from '@vc/Fields/index.mjs';
  import { inject } from 'vue';

  const {
    equippableGetters: {
      equippedSlotIds,
    },
    documentActions: {
      getDirectFieldUpdater,
    },
  } = inject('documentSheetStore') as EquippableDocumentStore;

  const updater = getDirectFieldUpdater('system.equippedSlotIds');
</script>
