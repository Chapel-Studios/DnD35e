<template>
  <CreatureSheetVue>
    <template #header-name>
      <CharacterNameField />
    </template>
  </CreatureSheetVue>
</template>

<script lang="ts" setup>
  import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
  import CreatureSheetVue from '@actors/creature/sheet/CreatureSheet.vue';
  import {
    attributesTab,
    buffsTab,
    combatTab,
    featuresTab,
    inventoryTab,
    notesTab,
    skillsTab,
    spellsTab,
    summaryTab,
  } from '@actors/creature/sheet/tabs/index.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { provide } from 'vue';

  import { useActorSheetStore } from './ActorSheetStore.mjs';
  import CharacterNameField from './components/CharacterNameField.vue';

  const props = defineProps<{
    context: VueApplicationContext<ActorDnd35e>;
  }>();

  const store = useActorSheetStore<ActorDnd35e>(props.context, {
    defaultTabs: [summaryTab, attributesTab, combatTab, inventoryTab, featuresTab, skillsTab, buffsTab, spellsTab, notesTab],
    defaultActiveTab: 'summary',
  });

  provide(DocumentSheetStoreSymbol, store);
</script>
