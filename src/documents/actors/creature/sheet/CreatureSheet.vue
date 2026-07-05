<template>
  <DocumentSheetBody :vertical-tabs="true" :show-status-area="false">
    <template #header-summary>
      <CreatureHeaderDetails>
        <slot v-if="$slots['header']" name="header" />
      </CreatureHeaderDetails>
    </template>
    <template v-if="$slots['header-name']" #header-name>
      <slot name="header-name" />
    </template>
    <template #sidebar>
      <CreatureSidebar>
        <slot name="sidebar" />
      </CreatureSidebar>
    </template>
  </DocumentSheetBody>
</template>

<script lang="ts" setup>
  import {
    EquipmentPaneStoreSymbol,
    useEquipmentPaneStore,
  } from '@actors/creature/sheet/EquipmentPaneStore.mjs';
  import { DocumentSheetBody } from '@documents/document/index.mjs';
  import { provide } from 'vue';

  import CreatureHeaderDetails from './components/CreatureHeaderDetails.vue';
  import CreatureSidebar from './components/CreatureSidebar.vue';

  provide(EquipmentPaneStoreSymbol, useEquipmentPaneStore());
</script>
