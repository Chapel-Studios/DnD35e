<template>
  <SheetSection
    :header="localize('dnd35e.ACTOR.bio.physical')"
    class="bio-section"
  >
    <template #grid>
      <CreatureAge />
      <CreatureHeight />
      <CreatureWeight />
    </template>
  </SheetSection>
</template>

<script setup lang="ts">
  import CreatureAge from '../../components/header/CreatureAge.vue';
  import CreatureHeight from '../../components/header/CreatureHeight.vue';
  import CreatureWeight from '../../components/header/CreatureWeight.vue';
  import SheetSection from '../sections/SheetSection.vue';

  const localize = (key: string) => game.i18n.localize(key);

</script>
