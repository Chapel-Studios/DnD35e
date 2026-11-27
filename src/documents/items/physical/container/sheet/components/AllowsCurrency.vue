<script setup lang="ts">
  import type { CheckBoxFormGroupProps } from '@vc/fields/formGroups/types.mjs';
  import { CheckBoxFormGroup } from '@vc/fields/index.mjs';

  const innerProps: CheckBoxFormGroupProps = {
    fieldPath: 'system.allowsCurrency',
  };
</script>

<template>
  <CheckBoxFormGroup
    v-bind="innerProps"
  />
</template>