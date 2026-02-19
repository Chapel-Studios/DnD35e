<template>
  <div class="header-details flexrow">
    <div class="flexcol">
      <DocumentName :labelKey="'DND35E.Name'" :value="displayName" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { DocumentName } from '@ec/CoreMixin/index.mjs';
  import { ItemSheetStore } from '@items/baseItem/index.mjs';
  import { inject } from 'vue';


  const {
    documentGetters: { displayName },
  } = inject('documentSheetStore') as ItemSheetStore;
</script>
