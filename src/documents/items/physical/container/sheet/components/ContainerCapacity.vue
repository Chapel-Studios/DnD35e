<template>
  <NumberFormGroup field-path="system.maxContentWeight" />
  <CheckBoxFormGroup field-path="system.contentsAreWeightless" />
</template>

<script setup lang="ts">
  import { CheckBoxFormGroup, NumberFormGroup } from '@vc/fields/index.mjs';
</script>
