<template>
  <SheetSection
    header="dnd35e.ACTOR.section.p-attributes"
    class="traits-section"
  >
    <template #list>
      <ActorSpeed />
      <CreatureSenses />
    </template>
    <template #grid>
      <ItemSize />
      <DistanceFormGroup
        field-path="system.reach"
      />
      <CheckBoxFormGroup
        field-path="system.isIncorporeal"
        readonly
      />
      <CheckBoxFormGroup
        field-path="system.isQuadraped"
        readonly
      />
      <TextFormGroup
        field-path="system.creatureType"
        readonly
      />
    </template>
  </SheetSection>
</template>

<script setup lang="ts">
  import ActorSpeed from '@actors/baseActor/sheet/components/ActorSpeed.vue';
  import CreatureSenses from '@actors/creature/sheet/components/CreatureSenses.vue';
  import { ItemSize } from '@items/physical/physicalItem/index.mjs';
  import { CheckBoxFormGroup, DistanceFormGroup, TextFormGroup } from '@vc/fields/index.mjs';

  import SheetSection from '../SheetSection.vue';
</script>

<style lang="scss" scoped>
</style>
