<script lang="ts" setup>
  import { DocumentHeader, DocumentName, ItemArt } from '@ec/CoreMixin/index.mjs';
  import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import { useActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
  import type { DnD35eActiveEffect } from '@effects/index.mjs';
  import { DocumentSheetBody } from '@vc/index.mjs';
  import type { VueApplicationContext } from '@vueApps/index.mjs';
  import { inject, provide } from 'vue';

  const props = defineProps<{
    context?: VueApplicationContext<DnD35eActiveEffect>;
  }>();

  const store = props.context
    ? useActiveEffectConfigStore(props.context)
    : inject('documentSheetStore');

  if (props.context) {
    provide('documentSheetStore', store);
  }

  const {
    documentGetters: {
      displayName,
    },
  } = store as ActiveEffectConfigStore;
</script>

<template>
  <DocumentSheetBody>
    <template #header>
      <DocumentHeader>
        <ItemArt>
          <slot name="header-name">
            <DocumentName label-key="EFFECT.Name" :value="displayName" />
          </slot>
        </ItemArt>

        <template name="header-status">
          <slot name="status"></slot>
        </template>
        <template name="summary">
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
