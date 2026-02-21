<script lang="ts" setup>
  import {
    DocumentHeader,
    DocumentName,
    NameArtWrapper,
  } from '@ec/CoreMixin/index.mjs';
  import type { ItemDnd35e } from '@items/baseItem/index.mjs';
  import { ItemSheetStore, useItemSheetStore } from '@items/baseItem/index.mjs';
  import type { ItemType } from '@items/itemTypes.mjs';
  import { DocumentSheetBody } from '@vc/index.mjs';
  import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
  import { inject, provide } from 'vue';

  const props = defineProps<{
    context?: VueApplicationContext<ItemDnd35e<ItemType>>;
  }>();

  const store = props.context
    ? useItemSheetStore(props.context)
    : inject('documentSheetStore');

  if (props.context) {
    provide('documentSheetStore', store);
  }

  const {
    documentGetters: {
      displayName,
    },
  } = store as ItemSheetStore;
</script>

<template>
  <DocumentSheetBody>
    <template #header>
      <DocumentHeader>
        <NameArtWrapper>
          <slot name="header-name">
            <DocumentName label-key="D35E.ItemName" :value="displayName" />
          </slot>
        </NameArtWrapper>

        <template #status>
          <slot name="status"></slot>
        </template>
        <template #summary>
          <slot name="header-summary"></slot>
        </template>
      </DocumentHeader>
    </template>
    <template #footer>
      <slot name="footer"></slot>
    </template>
  </DocumentSheetBody>
</template>

<style lang="scss">
  .sheet-tab {
    padding: 0.5rem 0.5rem 0 0;
    overflow: auto;
  }
</style>
