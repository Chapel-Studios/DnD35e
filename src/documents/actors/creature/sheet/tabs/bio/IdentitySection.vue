<template>
  <SheetSection
    :header="localize('dnd35e.ACTOR.bio.identity')"
    class="bio-section"
  >
    <template #grid>
      <CreatureGender />
      <CreatureDeity />
      <CreatureAlignment />
    </template>
    <template #list-append>
      <LanguagesList />
    </template>
  </SheetSection>
</template>

<script setup lang="ts">
  import CreatureAlignment from '../../components/header/CreatureAlignment.vue';
  import CreatureDeity from '../../components/header/CreatureDeity.vue';
  import CreatureGender from '../../components/header/CreatureGender.vue';
  import LanguagesList from '../../components/LanguagesList.vue';
  import SheetSection from '../sections/SheetSection.vue';

  const localize = (key: string) => game.i18n.localize(key);

</script>
