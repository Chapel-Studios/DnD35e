<template>
  <NumberFormGroup
    field-path="system.magicEquivalency"
    :read-only="props.readOnly"
  />
</template>

<script setup lang="ts">
  import { NumberFormGroup } from '@vc/fields/index.mjs';

  const props = defineProps<{
    /** When true, forces the readonly display. */
    readOnly?: boolean;
  }>();
</script>

<style lang="scss" scoped>
</style>
