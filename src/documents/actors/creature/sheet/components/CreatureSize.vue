<template>
  <section class="creature-size-section">
    <ItemSize />
    <DistanceFormGroup
      field-path="system.reach"
    />
    <CheckBoxFormGroup
      field-path="system.isIncorporeal"
      readonly
    />
    <CheckBoxFormGroup
      field-path="system.isQuadruped"
      readonly
    />
    <TextFormGroup
      field-path="system.creatureType"
      readonly
    />
  </section>
</template>

<script setup lang="ts">
  import ItemSize from '@items/physical/physicalItem/sheet/components/ItemSize.vue';
  import { CheckBoxFormGroup, DistanceFormGroup, TextFormGroup } from '@vc/fields/index.mjs';

</script>

<style lang="scss" scoped>
  .creature-size-section {
    display: grid;
    gap: 0.5rem;
    grid-auto-flow: column;
  }
</style>
