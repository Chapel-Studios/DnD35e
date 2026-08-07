<template>
  <tr
    class="inventory-row"
    :class="stripe === 'odd' ? 'stripe-odd' : 'stripe-even'"
    :data-container-uuid="containerUuidAttr"
  >
    <td class="name-col item-name">
      <button
        v-if="isContainer"
        type="button"
        class="field-control-btn container-expand-btn"
        :title="expandTitle"
        @click.stop="toggleExpanded"
      >
        <i class="fas" :class="isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'" />
      </button>
      <span
        class="drag-handle"
        :draggable="isInventoryEditable"
        :data-item-id="item.id"
        @dragstart="onDragStart($event, item)"
      >
        <i class="fas fa-grip-vertical" />
        <img
          :key="iconKey"
          class="item-icon"
          :src="itemIcon"
          :alt="item.name"
          draggable="false"
          loading="lazy"
        >
        <span class="item-label">{{ item.name }}</span>
      </span>
    </td>
    <td class="type-col">{{ typeLabel }}</td>
    <td class="qty-col">{{ quantity }}</td>
    <td class="weight-col">{{ weightDisplay }}</td>
    <td class="equip-col">
      <button
        v-if="showEquipToggle && isInventoryEditable"
        type="button"
        class="field-control-btn equip-toggle"
        :class="{ 'is-active': isEquipped }"
        data-equip-toggle
        :title="localize(equipToggleTitle)"
        @click="toggleEquipped(item as EQUIPPABLE_ITEMS)"
      >
        <i :class="isEquipped ? 'fas fa-toggle-on' : 'fas fa-toggle-off'" />
      </button>
    </td>
    <td class="open-col">
      <button
        type="button"
        class="field-control-btn open-sheet-btn"
        :title="localize('dnd35e.ACTOR.inventory.action.openItemSheet')"
        @click="openItemSheet(item)"
      >
        <i class="fas fa-up-right-from-square" />
      </button>
    </td>
    <td class="carry-col">
      <button
        v-if="isInventoryEditable && !isContained"
        type="button"
        class="field-control-btn carry-toggle"
        :title="localize(toggleTitle)"
        @click="toggleCarried(item)"
      >
        <i :class="isCarried ? 'fas fa-backpack' : 'fas fa-box-open'" />
      </button>
      <button
        v-else-if="isInventoryEditable"
        type="button"
        class="field-control-btn carry-toggle"
        :title="localize('dnd35e.CONTAINER.action.removeFromContainer')"
        @click="removeFromContainer(item)"
      >
        <i class="fas fa-arrow-up-from-bracket" />
      </button>
    </td>
    <td class="destroy-col">
      <button
        v-if="isInventoryEditable"
        type="button"
        class="field-control-btn destroy-item-btn"
        :title="localize('dnd35e.ACTOR.inventory.action.destroyItem')"
        @click="destroyItem(item)"
      >
        <i class="fas fa-trash" />
      </button>
    </td>
  </tr>

  <tr v-if="isContainer && isExpanded" class="contained-item-row">
    <td class="contained-item-cell" colspan="8">
      <Suspense>
        <InventoryListTable
          variant="container"
          :is-carried="isCarried"
          :container-uuid="item.uuid"
          :owner-uuid="ownerUuid"
          :toggle-title="toggleTitle"
          :forced-stripe="stripe"
          :field-path="resolvedFieldPath"
          empty-label="dnd35e.CONTAINER.ContentsEmpty"
        />
      </Suspense>
    </td>
  </tr>
</template>

<script setup lang="ts">
  import type { EquipSlot } from '@constants/equipmentSlots.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { syncContainmentAe } from '@effects/containment/index.mjs';
  import type { ItemDnd35e } from '@items/baseItem/index.mjs';
  import type { EQUIPPABLE_ITEMS, EquippableItemType, PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
  import { containerItemType, EQUIPPABLE_ITEM_TYPES, ITEM_TYPES_LOCALIZED } from '@items/itemTypes.mjs';
  import { EquippableItem } from '@items/physical/equippableItem/EquippableItem.mjs';
  import type { WeaponStore } from '@items/physical/weapon/sheet/WeaponStore.mjs';
  import { type SettingsStore,SettingsStoreSymbol } from '@settings/index.mjs';
  import { computed, defineAsyncComponent, inject, provide, ref } from 'vue';

  import type { CreatureDocumentStore } from '../../../creature/sheet/CreatureStore.mjs';
  import { INVENTORY_FIELD_PATH } from './inventoryFieldPath.mjs';

  // Lazily/dynamically imported to break the InventoryItemRow <-> InventoryListTable
  // circular reference (a row can render a nested list, whose rows render this component).
  const InventoryListTable = defineAsyncComponent(() => import('./InventoryListTable.vue'));

  const FALLBACK_ITEM_ICON = '/icons/svg/item-bag.svg';

  const props = withDefaults(defineProps<{
    item: PHYSICAL_ITEMS;
    /** 'carried' = actor carried/tracked lists; 'container' = a container's own contents. */
    variant?: 'carried' | 'container';
    toggleTitle?: string;
    /** Uuid of the actor that ultimately owns this item's chain of containers. */
    ownerUuid?: string | null;
    /** Alternating background applied to this row; forwarded unchanged to nested contents. */
    stripe?: 'even' | 'odd';
    /** Pseudo field-path this row's table is locked/overridden under. Forwarded to nested container tables. */
    fieldPath?: string;
    onDragStart: (event: DragEvent, item: PHYSICAL_ITEMS) => void;
  }>(), {
    variant: 'carried',
    toggleTitle: '',
    ownerUuid: null,
    stripe: 'even',
    fieldPath: undefined,
  });

  const localize = (key: string): string => game.i18n.localize(key);

  const {
    documentGetters: {
      physicalItems: injectedItems,
      getIsFieldEditable,
      getOrCreateItemRowStore,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;



  // Row-scoped store, cached/owned by the actor store (see ActorSheetStore.mts). Reads the
  // item's document through this store's own reactive ref rather than the `item` prop
  // directly, so field changes (e.g. isEquipped) are picked up without relying on the parent
  // to lift primitives out to work around stale prop references. Also provided so any nested
  // FormGroups/content in this row's subtree can inject the standard document sheet store.
  const itemRowStore = getOrCreateItemRowStore(props.item);
  provide(DocumentSheetStoreSymbol, itemRowStore);

  const {
    documentUuid: containerUuidAttr,
    documentId,
    type: itemType,
    img,
    quantity,
    weight,
    isCarried,
  } = itemRowStore.documentGetters;

  const {
    measurement: { weightDisplayShortLabel },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  // Falls back to the shared section-level path when no table-specific path was forwarded.
  const resolvedFieldPath = computed(() => props.fieldPath ?? INVENTORY_FIELD_PATH);

  // See InventoryListTable.vue's isInventoryEditable comment - same pseudo field-path, same
  // forceEdit rationale (carry/equip/destroy actions are normal play-mode actions).
  const isInventoryEditable = getIsFieldEditable(resolvedFieldPath.value, undefined, true);

  const sourceItems = computed<PHYSICAL_ITEMS[]>(() => injectedItems?.value ?? []);

  // In a container's own sheet the contents are shown with variant 'container';
  // they are "contained" (remove button shown instead of carry toggle, no equip).
  const isContained = computed<boolean>(() => props.variant === 'container');

  const isContainer = computed<boolean>(() => itemType.value === containerItemType);

  const itemIcon = computed<string>(() => img.value ?? FALLBACK_ITEM_ICON);
  const iconKey = computed<string>(() => `${documentId.value}:${img.value || 'fallback'}`);

  const weightDisplay = computed<string>(() => `${weight.value} ${weightDisplayShortLabel.value}`);
  const typeLabel = computed<string>(() => isContainer.value
    ? localize(ITEM_TYPES_LOCALIZED[containerItemType])
    : (itemRowStore as WeaponStore).documentGetters.weaponType.value
  );

  const isEquippable = (item: PHYSICAL_ITEMS): item is EQUIPPABLE_ITEMS => {
    return EQUIPPABLE_ITEM_TYPES.has(item.type as EquippableItemType);
  };

  const isEquipped = computed<boolean>(() => itemRowStore.documentGetters.getViewAwareFieldValue<boolean>('system.isEquipped') ?? false);

  const showEquipToggle = computed<boolean>(() =>
    !isContained.value
    && props.variant === 'carried'
    && isCarried.value
    && isEquippable(props.item));

  const equipToggleTitle = computed<string>(() =>
    isEquipped.value
      ? 'dnd35e.ACTOR.inventory.action.unequip'
      : 'dnd35e.ACTOR.inventory.action.equip');

  const expandTitle = computed<string>(() =>
    isExpanded.value
      ? localize('dnd35e.CONTAINER.action.collapse')
      : localize('dnd35e.CONTAINER.action.expand'));

  // ── Expansion (local per-row UI state) ──────────────────────────────────
  const isExpanded = ref(false);

  const toggleExpanded = (): void => {
    isExpanded.value = !isExpanded.value;
  };

  // ── Actions ─────────────────────────────────────────────────────────────
  const equippableItems = computed<EquippableItem[]>(() =>
    sourceItems.value.filter(isEquippable));

  const equipItemToSlots = async (item: EquippableItem, slots: EquipSlot[]): Promise<void> => {
    if (
      item.system.equippedSlotIds?.length === slots.length
      && item.system.equippedSlotIds?.every((slot) => slots.includes(slot))
    ) {
      return;
    }

    const conflictingItems = equippableItems.value.filter((other) => {
      if (other.id === item.id) return false;
      const otherSlots = other.system.equippedSlotIds ?? [];
      return otherSlots.some((slot) => slots.includes(slot));
    });

    for (const conflictingItem of conflictingItems) {
      await conflictingItem.performUnequip?.();
    }

    await item.performEquip?.(slots);
  };

  const toggleEquipped = async (item: EQUIPPABLE_ITEMS): Promise<void> => {
    if (!isEquippable(item)) return;

    if (item.system.isEquipped) {
      await item.performUnequip?.();
      return;
    }

    await equipItemToSlots(item, item.defaultSlotIds);
  };

  const toggleCarried = async (item: PHYSICAL_ITEMS): Promise<void> => {
    await item.update({ 'system.isCarried': !(isCarried.value) });
  };

  const removeFromContainer = async (item: PHYSICAL_ITEMS): Promise<void> => {
    await syncContainmentAe(item, null);
  };

  const destroyItem = async (item: PHYSICAL_ITEMS): Promise<void> => {
    const confirmMessage = localize('dnd35e.ACTOR.inventory.confirm.destroyItem')
      .replace('{itemName}', item.name);
    if (!window.confirm(confirmMessage)) return;

    await item.delete();
  };

  const openItemSheet = (item: ItemDnd35e): void => {
    item.sheet?.render(true);
  };
</script>

<style scoped lang="scss">
  .inventory-row {
    .qty-col,
    .weight-col {
      text-align: right;
    }

    .type-col {
      white-space: nowrap;
    }

    .item-name {
      align-items: center;
      display: flex;
      gap: 0.2rem;
      min-width: 0;
      width: 100%;
    }
  }

  .item-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .container-expand-btn {
    flex-shrink: 0;
    font-size: 0.65rem;
    padding: 0.1rem 0.2rem;
  }

  // Explicit stripe backgrounds, overriding Foundry's default nth-child table
  // striping so colors stay stable no matter how many rows an expanded container
  // inserts into the DOM (which would otherwise shift nth-child parity for every
  // row that follows it).
  .stripe-even > td {
    background: transparent !important;
  }

  .stripe-odd > td {
    background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 10%, transparent) !important;
  }

  // The nested container table lives inside a single colspan cell; keep its
  // horizontal inset small so it reads as an extension of the outer table.
  .contained-item-row {
    .contained-item-cell {
      padding: 0 0 0 0.6rem;
    }
  }

  .item-icon {
    border-radius: 0.2rem;
    display: block;
    flex-shrink: 0;
    height: 1.15rem;
    object-fit: cover;
    width: 1.15rem;
  }

  .carry-toggle,
  .equip-toggle,
  .open-sheet-btn {
    padding: 0.1rem 0.25rem;
  }

  .drag-handle {
    align-items: center;
    cursor: grab;
    display: inline-flex;
    gap: 0.3rem;
    min-width: 0;

    i {
      flex-shrink: 0;
      opacity: 0.5;
    }
  }
</style>
