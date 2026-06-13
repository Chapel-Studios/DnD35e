<template>
  <CreatureSheetVue>
    <template #header-name>
      <CharacterNameField />
    </template>
    <template #header>
      <CharacterRaceClass />
    </template>
  </CreatureSheetVue>
</template>

<script lang="ts" setup>
  import type { Character } from '@actors/character/Character.mjs';
  import CreatureSheetVue from '@actors/creature/sheet/CreatureSheet.vue';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { provide } from 'vue';

  import { useCharacterStore } from './CharacterStore.mjs';
  import CharacterNameField from './components/CharacterNameField.vue';
  import CharacterRaceClass from './components/CharacterRaceClass.vue';

  const props = defineProps<{
    context: VueApplicationContext<Character>;
  }>();

  const store = useCharacterStore(props.context);

  provide(DocumentSheetStoreSymbol, store);
</script>
