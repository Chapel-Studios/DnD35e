<script lang="ts">
  export type ContainerInventoryRowProps = Omit<InventoryItemRowProps, 'typeLabel' | 'item' | 'itemStore'> & {
    item: Container;
    itemStore: ContainerStore;
  }
</script>

<script setup lang="ts">
  import type { InventoryItemRowProps } from '@actors/baseActor/sheet/components/InventoryItemRow.vue';
  import InventoryItemRow, { BaseInventoryItemRowPropDefaults } from '@actors/baseActor/sheet/components/InventoryItemRow.vue';
  // InventoryListTable statically imports ContainerInventoryRow (for rendering container
  // rows), so this is a circular import. Safe as a static import: the reference is only
  // used inside the compiled render function, which runs after both modules finish
  // evaluating, never at module top-level. Vite/Rollup always inlines InventoryListTable
  // into the main chunk anyway (it's also statically imported by ActorInventorySection.vue
  // and ContainerInventory.vue), so a dynamic import here bought no code-splitting benefit.
  import InventoryListTable from '@actors/baseActor/sheet/components/InventoryListTable.vue';
  import { containerItemType, ITEM_TYPES_LOCALIZED } from '@items/itemTypes.mjs';
  import { computed, ref } from 'vue';

  import type { Container } from '../../Container.mjs';
  import type { ContainerStore } from '../ContainerStore.mjs';

  const localize = (key: string): string => game.i18n.localize(key);

  const props = withDefaults(defineProps<ContainerInventoryRowProps>(), {
    ...BaseInventoryItemRowPropDefaults,
  });

  const {
    contents,
    isCarried,
    documentUuid,
  } = props.itemStore.documentGetters;

  const isExpanded = ref(false);

  const toggleExpanded = (): void => {
    isExpanded.value = !isExpanded.value;
  };

  const expandTitle = computed<string>(() =>
    isExpanded.value
      ? localize('dnd35e.CONTAINER.action.collapse')
      : localize('dnd35e.CONTAINER.action.expand')
  );

</script>

<template>
  <InventoryItemRow
    v-bind="props"
    :type-label="ITEM_TYPES_LOCALIZED[containerItemType]"
    empty-icon="fas fa-box-open"
  >
    <template #name-prefix>
      <button
        type="button"
        class="field-control-btn container-expand-btn"
        :title="expandTitle"
        @click.stop="toggleExpanded"
      >
        <i class="fas" :class="isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'" />
      </button>
    </template>
    <template #bonus-row>
      <tr v-if="isExpanded" class="contained-item-row">
        <td class="contained-item-cell" colspan="8">
          <InventoryListTable
            variant="contained"
            :items="contents"
            :is-carried="isCarried"
            :container-uuid="documentUuid"
            :owner-uuid="ownerUuid"
            :toggle-title="toggleTitle"
            :forced-stripe="stripe"
            :field-path="fieldPath"
            empty-label="dnd35e.CONTAINER.ContentsEmpty"
          />
        </td>
      </tr>
    </template>
  </InventoryItemRow>
</template>

