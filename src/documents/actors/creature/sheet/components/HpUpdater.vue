<template>
  
</template>

<script setup lang="ts">
  import type { FieldEditability, FieldVisibility } from '@vc/fields/index.mjs';

  defineProps<{
    label?: string;
    hint?: string;
    fieldPath: string;
    defaultVisibility?: FieldVisibility;
    defaultEditability?: FieldEditability;
  }>();

</script>

<style lang="scss" scoped>
</style>
