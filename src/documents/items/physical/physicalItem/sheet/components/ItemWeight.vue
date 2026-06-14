<template>
  <WeightFormGroup
    field-path="system.weight"
  >
    <template v-if="slots.controls" #controls="{ editable }">
      <slot name="controls" :editable="editable" />
    </template>
  </WeightFormGroup>
</template>
<script setup lang="ts">
  import WeightFormGroup from '@vc/fields/formGroups/WeightFormGroup.vue';
  import { useSlots } from 'vue';

  const slots = useSlots();
</script>
