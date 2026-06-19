<template>
  <MultiSelectFormGroup
    :options="EQUIP_SLOT_SELECT_OPTIONS"
    field-path="system.equippedSlotIds"
  />
</template>
<script setup lang="ts">
  import { EQUIP_SLOT_SELECT_OPTIONS } from '@constants/equipmentSlots.mjs';
  import { MultiSelectFormGroup } from '@vc/fields/index.mjs';
</script>
