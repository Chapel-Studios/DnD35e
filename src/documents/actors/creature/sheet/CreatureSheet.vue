<template>
  <DocumentSheetBody :vertical-tabs="true" :show-status-area="false">
    <template #header-summary>
      <CreatureHeaderDetails />
    </template>
    <template v-if="$slots['header-name']" #header-name>
      <slot name="header-name" />
    </template>
  </DocumentSheetBody>
</template>

<script lang="ts" setup>
  import { DocumentSheetBody } from '@documents/document/index.mjs';

  import CreatureHeaderDetails from './components/CreatureHeaderDetails.vue';
</script>
