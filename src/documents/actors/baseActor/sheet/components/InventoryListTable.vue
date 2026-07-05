<template>
  <div
    class="inventory-drop-zone"
    :class="{ 'is-drop-target': dropZoneState.active }"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <CategorizedListTable
      :title="title"
      :column-count="7"
      :rows="rows"
      :empty-label="emptyLabel"
      :empty-icon="isCarried ? 'fas fa-backpack' : 'fas fa-box-open'"
      :enable-subcategory-collapse="true"
    >
      <template #header>
        <tr>
          <th class="name-col">{{ localize('dnd35e.ACTOR.inventory.column.name') }}</th>
          <th class="type-col">{{ localize('dnd35e.ACTOR.inventory.column.type') }}</th>
          <th class="qty-col">{{ localize('dnd35e.ACTOR.inventory.column.quantity') }}</th>
          <th class="weight-col">{{ localize('dnd35e.ACTOR.inventory.column.weight') }}</th>
          <th class="equip-col" />
          <th class="open-col" />
          <th class="carry-col" />
        </tr>
      </template>

      <template #row="{ row }">
        <tr class="inventory-row">
          <td class="name-col item-name">
            <span
              class="drag-handle"
              draggable="true"
              :data-item-id="getRowItem(row).id"
              @dragstart="onDragStart($event, getRowItem(row))"
            >
              <i class="fas fa-grip-vertical" />
              <img
                :key="getIconKey(getRowItem(row))"
                class="item-icon"
                :src="getItemIcon(getRowItem(row))"
                :alt="getRowItem(row).name"
                draggable="false"
                @error="onItemIconError(getRowItem(row), $event)"
                loading="lazy"
              >
              {{ getRowItem(row).name }}
            </span>
          </td>
          <td class="type-col">{{ getRowTypeLabel(row) }}</td>
          <td class="qty-col">{{ getRowQuantity(row) }}</td>
          <td class="weight-col">{{ getRowWeightDisplay(row) }}</td>
          <td class="equip-col">
            <button
              v-if="isCarried && isEquippable(getRowItem(row))"
              type="button"
              class="field-control-btn equip-toggle"
              :title="localize(getEquipToggleTitle(getRowItem(row)))"
              @click="toggleEquipped(getRowItem(row))"
            >
              <i :class="isItemEquipped(getRowItem(row)) ? 'fas fa-toggle-on' : 'fas fa-toggle-off'" />
            </button>
          </td>
          <td class="open-col">
            <button
              type="button"
              class="field-control-btn open-sheet-btn"
              :title="localize('dnd35e.ACTOR.inventory.action.openItemSheet')"
              @click="openItemSheet(getRowItem(row))"
            >
              <i class="fas fa-up-right-from-square" />
            </button>
          </td>
          <td class="carry-col">
            <button
              type="button"
              class="field-control-btn carry-toggle"
              :title="localize(toggleTitle)"
              @click="toggleCarried(getRowItem(row))"
            >
              <i :class="isCarried ? 'fas fa-backpack' : 'fas fa-box-open'" />
            </button>
          </td>
        </tr>
      </template>
    </CategorizedListTable>
  </div>
</template>

<script setup lang="ts">
  import type { ActorDocumentStore } from '@actors/baseActor/sheet/index.mjs';
  import {
    type EquipSlot,
    MAIN_HAND_EQUIP_SLOT,
    OFF_HAND_EQUIP_SLOT,
  } from '@constants/equipmentSlots.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { ItemDnd35e } from '@items/baseItem/index.mjs';
  import type { PhysicalItemType } from '@items/itemTypes.mjs';
  import {
    ITEM_TYPES_LOCALIZED,
    PHYSICAL_ITEM_TYPES,
  } from '@items/itemTypes.mjs';
  import CategorizedListTable from '@vc/CategorizedListTable.vue';
  import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

  const ALLOWED_ITEM_TYPES = PHYSICAL_ITEM_TYPES;

  type AllowedItemType = PhysicalItemType;

  type InventoryItemData = {
    isCarried?: boolean;
    quantity?: number;
    weight?: number;
    weaponSubtype?: string;
    isEquipped?: boolean;
    equippedSlotIds?: EquipSlot[];
  };

  type EquippableItemDocument = ItemDnd35e & {
    system: InventoryItemData;
    performEquip?: (slotIds: EquipSlot[]) => Promise<void> | void;
  };

  type InventoryRow = {
    id: string;
    categoryId: string;
    categoryLabel: string;
    subcategoryId: string;
    subcategoryLabel: string;
    sortKey: string;
    item: ItemDnd35e;
    quantity: number;
    weightDisplay: string;
    typeLabel: string;
    isCarried: boolean;
  };

  const props = defineProps<{
    title: string;
    emptyLabel: string;
    toggleTitle: string;
    isCarried: boolean;
  }>();

  const DRAG_SOURCE_KEY = 'inventorySourceIsCarried';

  const SUBCATEGORY_LABELS = {
    unarmed: 'dnd35e.ACTOR.inventory.subcategory.unarmed',
    mainOrOff: 'dnd35e.ACTOR.inventory.subcategory.mainOrOff',
    twoHanded: 'dnd35e.ACTOR.inventory.subcategory.twoHanded',
    mainOnly: 'dnd35e.ACTOR.inventory.subcategory.mainOnly',
    offOnly: 'dnd35e.ACTOR.inventory.subcategory.offOnly',
    ranged: 'dnd35e.ACTOR.inventory.subcategory.ranged',
    other: 'dnd35e.ACTOR.inventory.subcategory.other',
  } as const;

  const SUBCATEGORY_ORDER: Record<keyof typeof SUBCATEGORY_LABELS, number> = {
    unarmed: 0,
    mainOrOff: 1,
    twoHanded: 2,
    mainOnly: 3,
    offOnly: 4,
    ranged: 5,
    other: 99,
  };

  const localize = (key: string): string => game.i18n.localize(key);

  const store = inject(DocumentSheetStoreSymbol) as ActorDocumentStore;
  const actorId = computed(() => store._storeUtils.document.value.id);
  const embeddedItemRefresh = ref(0);

  const bumpEmbeddedItemRefresh = (): void => {
    embeddedItemRefresh.value += 1;
  };

  const actorItems = computed(() => {
    // Force recompute when embedded items change (img, carried state, etc.)
    embeddedItemRefresh.value;
    const actor = store._storeUtils.document.value;
    return [...actor.items];
  });

  const rows = computed<InventoryRow[]>(() => {
    return actorItems.value
      .filter(
        (item) => ALLOWED_ITEM_TYPES.has(item.type as AllowedItemType)
          && (item.system as InventoryItemData).isCarried === props.isCarried
      )
      .map((item) => {
        const itemData = item.system as InventoryItemData;
        const { subcategoryId, subcategoryLabel } = resolveWeaponSubcategory(itemData.weaponSubtype);
        const quantity = itemData.quantity ?? 1;
        const weight = itemData.weight ?? 0;
        const allowedType = item.type as AllowedItemType;

        return {
          id: item.id,
          categoryId: allowedType,
          categoryLabel: localize(ITEM_TYPES_LOCALIZED[allowedType]),
          subcategoryId,
          subcategoryLabel,
          sortKey: `${SUBCATEGORY_ORDER[subcategoryId]}-${item.name.toLowerCase()}`,
          item,
          quantity,
          weightDisplay: `${weight}`,
          typeLabel: localize('dnd35e.WEAPON.Type.' + ((item.system as { weaponType?: string }).weaponType ?? 'simple')),
          isCarried: itemData.isCarried ?? false,
        };
      })
      .filter((row) => row.isCarried === props.isCarried);
  });

  const getRowItem = (row: unknown): ItemDnd35e => (row as InventoryRow).item;
  const getRowTypeLabel = (row: unknown): string => (row as InventoryRow).typeLabel;
  const getRowQuantity = (row: unknown): number => (row as InventoryRow).quantity;
  const getRowWeightDisplay = (row: unknown): string => (row as InventoryRow).weightDisplay;

  const isEquippable = (item: ItemDnd35e): item is EquippableItemDocument => {
    const data = item.system as InventoryItemData | undefined;
    return !!data && Array.isArray(data.equippedSlotIds);
  };

  const isItemEquipped = (item: ItemDnd35e): boolean => {
    if (!isEquippable(item)) return false;
    return (item.system.isEquipped ?? false) || (item.system.equippedSlotIds?.length ?? 0) > 0;
  };

  const getEquipToggleTitle = (item: ItemDnd35e): string => {
    return isItemEquipped(item) ? 'dnd35e.ACTOR.inventory.action.unequip' : 'dnd35e.ACTOR.inventory.action.equip';
  };

  const getPreferredSlotsForEquip = (item: EquippableItemDocument): EquipSlot[] => {
    if (item.type !== 'weapon') return [MAIN_HAND_EQUIP_SLOT];

    const weaponSubtype = item.system.weaponSubtype;
    if (weaponSubtype === 'twoHanded') {
      return [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT];
    }

    return [MAIN_HAND_EQUIP_SLOT];
  };

  const getEquippedSlots = (item: EquippableItemDocument): EquipSlot[] => {
    return [...(item.system.equippedSlotIds ?? [])];
  };

  const equippableItems = computed<EquippableItemDocument[]>(() => {
    return actorItems.value.filter(isEquippable);
  });

  const equipItemToSlots = async (item: EquippableItemDocument, slots: EquipSlot[]): Promise<void> => {
    const conflictingItems = equippableItems.value.filter((other) => {
      if (other.id === item.id) return false;
      const otherSlots = getEquippedSlots(other);
      return otherSlots.some(slot => slots.includes(slot));
    });

    for (const conflictingItem of conflictingItems) {
      await conflictingItem.update({
        'system.isEquipped': false,
        'system.equippedSlotIds': [],
      });
    }

    const updated = await item.update({
      'system.isEquipped': true,
      'system.equippedSlotIds': slots,
    }) as EquippableItemDocument | undefined;

    const equippedItem = updated ?? item;
    if (typeof equippedItem.performEquip === 'function') {
      await equippedItem.performEquip(slots);
    }
  };

  const toggleEquipped = async (item: ItemDnd35e): Promise<void> => {
    if (!isEquippable(item)) return;

    if (isItemEquipped(item)) {
      await item.update({
        'system.isEquipped': false,
        'system.equippedSlotIds': [],
      });
      return;
    }

    const preferredSlots = getPreferredSlotsForEquip(item);
    await equipItemToSlots(item, preferredSlots);
  };

  const FALLBACK_ITEM_ICON = '/icons/svg/item-bag.svg';
  const failedIconSrcByItemId = reactive<Record<string, string>>({});

  const normalizeImgPath = (src: string): string => {
    if (!src) return '';
    if (/^(https?:|data:|blob:|\/)/i.test(src)) return src;
    return `/${src}`;
  };

  const getCanonicalItemImg = (item: ItemDnd35e): string => {
    const sourceImg = item._source?.img;
    if (typeof sourceImg === 'string' && sourceImg.length > 0) {
      return normalizeImgPath(sourceImg);
    }
    const runtimeImg = item.img;
    return typeof runtimeImg === 'string' ? normalizeImgPath(runtimeImg) : '';
  };

  const getItemIcon = (item: ItemDnd35e): string => {
    const src = getCanonicalItemImg(item) || FALLBACK_ITEM_ICON;
    return failedIconSrcByItemId[item.id] === src ? FALLBACK_ITEM_ICON : src;
  };

  const onItemIconError = (item: ItemDnd35e, event: Event): void => {
    const attemptedSrc = getCanonicalItemImg(item) || FALLBACK_ITEM_ICON;
    failedIconSrcByItemId[item.id] = attemptedSrc;

    const target = event.target as HTMLImageElement | null;
    if (!target) return;
    target.src = FALLBACK_ITEM_ICON;
  };

  const getIconKey = (item: ItemDnd35e): string => {
    return `${item.id}:${item.img || 'fallback'}:${embeddedItemRefresh.value}`;
  };

  const resolveWeaponSubcategory = (weaponSubtype: string | undefined): {
    subcategoryId: keyof typeof SUBCATEGORY_LABELS;
    subcategoryLabel: string;
  } => {
    switch (weaponSubtype) {
    case 'unarmed':
      return {
        subcategoryId: 'unarmed',
        subcategoryLabel: localize(SUBCATEGORY_LABELS.unarmed),
      };
    case 'ranged':
      return {
        subcategoryId: 'ranged',
        subcategoryLabel: localize(SUBCATEGORY_LABELS.ranged),
      };
    case 'twoHanded':
      return {
        subcategoryId: 'twoHanded',
        subcategoryLabel: localize(SUBCATEGORY_LABELS.twoHanded),
      };
    case 'oneHanded':
    case 'light':
      return {
        subcategoryId: 'mainOrOff',
        subcategoryLabel: localize(SUBCATEGORY_LABELS.mainOrOff),
      };
    default:
      return {
        subcategoryId: 'other',
        subcategoryLabel: localize(SUBCATEGORY_LABELS.other),
      };
    }
  };

  const toggleCarried = async (item: ItemDnd35e): Promise<void> => {
    const itemData = item.system as InventoryItemData;
    const nextState = !(itemData.isCarried ?? false);
    await item.update({ 'system.isCarried': nextState });
  };

  const openItemSheet = (item: ItemDnd35e): void => {
    item.sheet?.render(true);
  };

  const dropZoneState = reactive({
    active: false,
    depth: 0,
  });

  let dragGhostEl: HTMLDivElement | null = null;

  const endDragPreview = (): void => {
    dropZoneState.active = false;
    dropZoneState.depth = 0;
    window.removeEventListener('dragend', endDragPreview);
    if (dragGhostEl) {
      dragGhostEl.remove();
      dragGhostEl = null;
    }
  };

  const createDragGhost = (item: ItemDnd35e): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'inventory-drag-ghost';

    const icon = document.createElement('img');
    icon.className = 'inventory-drag-ghost-icon';
    icon.src = getItemIcon(item);
    icon.alt = item.name;
    icon.onerror = () => {
      icon.src = FALLBACK_ITEM_ICON;
    };

    const name = document.createElement('span');
    name.textContent = item.name;

    el.appendChild(icon);
    el.appendChild(name);
    document.body.appendChild(el);

    return el;
  };

  const onDragStart = (event: DragEvent, item: ItemDnd35e): void => {
    const payload = {
      ...item.toDragData(),
      [DRAG_SOURCE_KEY]: props.isCarried,
    };
    event.dataTransfer?.setData('text/plain', JSON.stringify(payload));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.dropEffect = 'move';
      dragGhostEl = createDragGhost(item);
      event.dataTransfer.setDragImage(dragGhostEl, 10, 10);
    }

    window.addEventListener('dragend', endDragPreview);
  };

  const onDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const onDragEnter = (event: DragEvent): void => {
    event.preventDefault();
    dropZoneState.depth += 1;
    dropZoneState.active = true;
  };

  const onDragLeave = (event: DragEvent): void => {
    event.preventDefault();
    dropZoneState.depth = Math.max(0, dropZoneState.depth - 1);
    if (dropZoneState.depth === 0) {
      dropZoneState.active = false;
    }
  };

  const onDrop = async (event: DragEvent): Promise<void> => {
    dropZoneState.active = false;
    dropZoneState.depth = 0;

    const rawData = foundry.applications.ux.TextEditor.getDragEventData(event) as Record<string, unknown>;
    const type = rawData?.type;
    if (type !== 'Item') return;

    const sourceIsCarried = rawData[DRAG_SOURCE_KEY];
    if (typeof sourceIsCarried !== 'boolean') return;

    const dropped = await Item.implementation.fromDropData(rawData);
    if (!(dropped instanceof Item)) return;

    const actor = store._storeUtils.document.value;
    const parent = dropped.parent;
    const sameActorItem = parent instanceof Actor && parent.id === actor.id;
    if (!sameActorItem) return;

    event.preventDefault();
    event.stopPropagation();

    const droppedData = dropped.system as InventoryItemData;
    const nextIsCarried = props.isCarried;
    if ((droppedData.isCarried ?? false) !== nextIsCarried) {
      await dropped.update({ 'system.isCarried': nextIsCarried });
    }
    endDragPreview();
  };

  const onAnyEmbeddedItemMutation = (...args: unknown[]): void => {
    const item = args[0];
    if (!(item instanceof Item)) return;

    const parent = item.parent;
    if (!(parent instanceof Actor)) return;
    if (parent.id !== actorId.value) return;

    delete failedIconSrcByItemId[item.id];
    bumpEmbeddedItemRefresh();
  };

  onMounted(() => {
    Hooks.on('updateItem', onAnyEmbeddedItemMutation);
    Hooks.on('createItem', onAnyEmbeddedItemMutation);
    Hooks.on('deleteItem', onAnyEmbeddedItemMutation);
  });

  onBeforeUnmount(() => {
    Hooks.off('updateItem', onAnyEmbeddedItemMutation);
    Hooks.off('createItem', onAnyEmbeddedItemMutation);
    Hooks.off('deleteItem', onAnyEmbeddedItemMutation);
    endDragPreview();
  });
</script>

<style scoped lang="scss">
  .inventory-row {
    .equip-col,
    .open-col,
    .carry-col {
      width: 2rem;
    }

    .qty-col,
    .weight-col {
      text-align: right;
      width: 3.75rem;
    }

    .type-col {
      white-space: nowrap;
      width: 7rem;
    }

    .item-name {
      width: 100%;
      min-width: 8rem;
    }
  }

  .inventory-drop-zone {
    border-radius: 0.45rem;
    transition: box-shadow 0.15s ease, background-color 0.15s ease;

    &.is-drop-target {
      background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 14%, transparent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-cool-4, #9ba5a0) 65%, transparent);
    }
  }

  .item-icon {
    border-radius: 0.2rem;
    display: block;
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
      opacity: 0.5;
    }
  }

  :global(.inventory-drag-ghost) {
    align-items: center;
    background: color-mix(in srgb, var(--color-cool-5, #6f7e77) 88%, transparent);
    border: 1px solid color-mix(in srgb, #fff 20%, transparent);
    border-radius: 0.35rem;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.24);
    color: var(--color-text-light-primary, #f8f8f8);
    display: inline-flex;
    font-size: 0.72rem;
    gap: 0.35rem;
    max-width: 18rem;
    padding: 0.2rem 0.35rem;
    pointer-events: none;
    position: fixed;
    z-index: 9999;
  }

  :global(.inventory-drag-ghost-icon) {
    border-radius: 0.2rem;
    height: 1rem;
    object-fit: cover;
    width: 1rem;
  }
</style>
