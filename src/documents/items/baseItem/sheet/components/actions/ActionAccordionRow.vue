<template>
  <component :is="actionComponent" />
</template>

<script lang="ts">
  import type { ActionEditorStore } from '@items/baseItem/actions/ActionEditorStore.mts';

  export type ActionAccordionRowProps = {
    actionId: string;
    actionType: ActionType;
    link?: ActionChainLinkModel;
    
  };
</script>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { ActionEditorStoreSymbol } from '@items/baseItem/actions/ActionEditorStore.mjs';
  import type { ActionChainLinkModel } from '@items/baseItem/actions/ActionSourceData.mjs';
  import type { ActionType } from '@items/baseItem/actions/constants.mjs';
  import { getActionRow } from '@items/baseItem/actions/GetActionRow.mjs';
  import type { Ref } from 'vue';
  import { inject, provide, ref } from 'vue';

  interface DocStoreThatCreatesActionEditorStore {
    _storeUtils: {
      createActionEditorStore?: (actionId: string, link?: Ref<ActionChainLinkModel>) => ActionEditorStore;
    };
  }

  const {
    actionId,
    actionType,
    link,
  } = defineProps<ActionAccordionRowProps>();

  const possibleActionEditorStore = inject<ActionEditorStore>(ActionEditorStoreSymbol);

  const createActionEditorStore = possibleActionEditorStore?.actions.createActionEditorStore
    ?? (inject(DocumentSheetStoreSymbol) as DocStoreThatCreatesActionEditorStore)
      ._storeUtils
      .createActionEditorStore;

  if (!createActionEditorStore) {
    throw new Error('Unable to create ActionEditorStore: createActionEditorStore function is not available.');
  }

  const linkRef: Ref<ActionChainLinkModel> | undefined = link ? ref(link) : undefined;
  const actionStore = createActionEditorStore(actionId, linkRef);
  provide(ActionEditorStoreSymbol, actionStore);

  const actionComponent = getActionRow(actionType);
</script>
