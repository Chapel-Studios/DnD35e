<template>
  <ComboBoxFormGroup
    :options="options"
    field-path="system.ammoType"
  />
</template>

<script setup lang="ts">
  import { AMMO_TYPE_LOCALIZED, AMMO_TYPES } from '@items/physical/ammo/index.mjs';
  import { ComboBoxFormGroup } from '@vc/fields/index.mjs';

  const options = Array.from(AMMO_TYPES, value => ({
    value,
    label: AMMO_TYPE_LOCALIZED[value],
  }));
</script>
