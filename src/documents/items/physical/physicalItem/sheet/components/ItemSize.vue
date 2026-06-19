<template>
  <SelectFormGroup
    :options="SIZE_SELECT_OPTIONS"
    field-path="system.size"
  />
</template>

<script setup lang="ts">
  import { SIZE_SELECT_OPTIONS } from '@constants/sizes.mjs';
  import { SelectFormGroup } from '@vc/fields/index.mjs';
</script>
