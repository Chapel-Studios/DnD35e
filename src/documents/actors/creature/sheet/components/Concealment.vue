<template>
  <NumberFormGroup
    field-path="system.defense.concealment"
    :min="0"
    :max="100"
    unit="%"
  />
</template>

<script setup lang="ts">
  import { NumberFormGroup } from '@vc/fields/index.mjs';
</script>

<style lang="scss" scoped>
</style>
