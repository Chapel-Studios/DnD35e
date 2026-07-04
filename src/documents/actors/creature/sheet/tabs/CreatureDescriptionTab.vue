<template>
  <ActorDescriptionTab description-label="dnd35e.ACTOR.field.Biography">
    <template #prepend>
      <slot name="header" />
      <IdentitySection />
      <PhysicalSection />
      <slot name="prepend" />
    </template>
    <template #append>
      <slot name="append" />
      <SessionNotes />
      <slot name="footer" />
    </template>
  </ActorDescriptionTab>
</template>

<script setup lang="ts">
  import ActorDescriptionTab from '@actors/baseActor/sheet/tabs/ActorDescriptionTab.vue';

  import SessionNotes from '../components/SessionNotes.vue';
  import IdentitySection from './bio/IdentitySection.vue';
  import PhysicalSection from './bio/PhysicalSection.vue';
</script>
