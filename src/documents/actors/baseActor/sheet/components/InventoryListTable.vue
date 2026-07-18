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
      :column-count="8"
      :rows="rows"
      :empty-label="emptyLabel"
      :empty-icon="emptyIcon"
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
          <th class="delete-col" />
        </tr>
      </template>

      <template #row="{ row }">
        <tr
          class="inventory-row"
          :data-container-uuid="getRowContainerUuid(row)"
        >
          <td class="name-col item-name">
            <button
              v-if="isContainerRow(row)"
              type="button"
              class="field-control-btn container-expand-btn"
              :title="getContainerExpandTitle(row)"
              @click.stop="toggleContainerExpand(getRowItem(row).id)"
            >
              <i class="fas" :class="isContainerExpanded(getRowItem(row).id) ? 'fa-chevron-down' : 'fa-chevron-right'" />
            </button>
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
              v-if="variant === 'carried' && isCarried && isEquippable(getRowItem(row))"
              type="button"
              class="field-control-btn equip-toggle"
              :title="localize(getEquipToggleTitle(getRowItem(row)))"
              @click="toggleEquipped(getRowItem(row) as EQUIPPABLE_ITEMS)"
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
              v-if="variant === 'carried'"
              type="button"
              class="field-control-btn carry-toggle"
              :title="localize(toggleTitle)"
              @click="toggleCarried(getRowItem(row))"
            >
              <i :class="isCarried ? 'fas fa-backpack' : 'fas fa-box-open'" />
            </button>
            <button
              v-else
              type="button"
              class="field-control-btn carry-toggle"
              :title="localize('dnd35e.CONTAINER.action.removeFromContainer')"
              @click="removeFromContainer(getRowItem(row))"
            >
              <i class="fas fa-arrow-up-from-bracket" />
            </button>
          </td>
          <td class="destroy-col">
            <button
              type="button"
              class="field-control-btn destroy-item-btn"
              :title="localize('dnd35e.ACTOR.inventory.action.destroyItem')"
              @click="destroyItem(getRowItem(row))"
            >
              <i class="fas fa-trash" />
            </button>
          </td>
        </tr>
        <template v-if="isContainerContentsRow(row)">
          <tr class="inventory-row contained-item-row">
            <td class="contained-item-cell" colspan="8">
              <InventoryListTable
                :title="getRowItem(row).name"
                variant="container"
                :is-carried="isCarried"
                :container-uuid="getRowItem(row).uuid"
                :owner-uuid="effectiveOwnerUuid"
                empty-label="dnd35e.CONTAINER.ContentsEmpty"
              />
            </td>
          </tr>
        </template>
      </template>
    </CategorizedListTable>
  </div>
</template>

<script setup lang="ts">
  import type { CreatureDocumentStore } from '@actors/creature/sheet/CreatureStore.mjs';
  import type { EquipSlot } from '@constants/equipmentSlots.mjs';
  import type { WeaponSubcategory } from '@constants/inventory.mjs';
  import { SUBCATEGORY_LABELS, SUBCATEGORY_ORDER, WEAPON_SUBCATEGORY } from '@constants/inventory.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import { syncContainmentAe } from '@effects/containment/index.mjs';
  import type { ItemDnd35e } from '@items/baseItem/index.mjs';
  import type { EQUIPPABLE_ITEMS, PHYSICAL_ITEMS, PhysicalItemType } from '@items/itemTypes.mjs';
  import {
    containerItemType,
    ITEM_TYPES_LOCALIZED,
    PHYSICAL_ITEM_TYPES,
  } from '@items/itemTypes.mjs';
  import type { Container } from '@items/physical/container/Container.mjs';
  import { EquippableItem } from '@items/physical/equippableItem/EquippableItem.mjs';
  import type { PhysicalItemLike } from '@items/physical/physicalItem/PhysicalItem.mjs';
  import { WEAPON_SUBTYPE } from '@items/physical/weapon/data/constants.mjs';
  import type { Weapon, WeaponSubtype, WeaponSystemData } from '@items/physical/weapon/index.mjs';
  import CategorizedListTable, { type CategorizedRow } from '@vc/CategorizedListTable.vue';
  import { computed, inject, onBeforeUnmount, reactive } from 'vue';

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

  type InventoryRow = CategorizedRow & {
    item: PHYSICAL_ITEMS;
    quantity: number;
    weightDisplay: string;
    typeLabel: string;
    isCarried: boolean;
  };

  const props = withDefaults(defineProps<{
    title: string;
    emptyLabel: string;
    toggleTitle?: string;
    isCarried?: boolean;
    /** 'carried' = actor carried/tracked lists; 'container' = a container's contents. */
    variant?: 'carried' | 'container';
    /** Explicit item list. When omitted the injected actor store is used. */
    items?: PHYSICAL_ITEMS[];
    /** UUID of the container item (container variant). Used to link/unlink items. */
    containerUuid?: string;
    /** Uuid of the actor that owns the container (container variant); null when unowned. */
    ownerUuid?: string | null;
  }>(), {
    toggleTitle: '',
    isCarried: false,
    variant: 'carried',
    items: undefined,
    containerUuid: undefined,
    ownerUuid: null,
  });

  const DRAG_SOURCE_KEY = 'inventorySourceIsCarried';

  const localize = (key: string): string => game.i18n.localize(key);

  const {
    documentGetters: {
      documentUuid,
      physicalItems: injectedItems,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const effectiveOwnerUuid = computed<string | null>(() => {
    return props.ownerUuid ?? documentUuid.value ?? null;
  });

  /** The item pool this list renders from: explicit prop, else injected actor items. */
  const sourceItems = computed<PHYSICAL_ITEMS[]>(() => props.items ?? injectedItems?.value ?? []);

  const emptyIcon = computed(() => {
    if (props.variant === 'container') return 'fas fa-box-open';
    return props.isCarried ? 'fas fa-backpack' : 'fas fa-box-open';
  });

  const rows = computed<InventoryRow[]>(() => {
    const legacyContainerId = props.containerUuid
      ? sourceItems.value.find((item) => item.uuid === props.containerUuid)?.id
      : null;

    return sourceItems.value
      .filter((item) => {
        if (!ALLOWED_ITEM_TYPES.has(item.type as AllowedItemType)) return false;

        if (props.variant === 'container') {
          const parentRef = item.system.containerUuid;
          return (
            item.uuid !== props.containerUuid
            && (
              parentRef === props.containerUuid
              || (!!legacyContainerId && parentRef === legacyContainerId)
            )
          );
        }

        return !item.system.containerUuid;
      })
      .map((item) => {
        const itemData = item.system;
        const { subcategoryId, subcategoryLabel } = isWeapon(item)
          ? resolveWeaponSubcategory((itemData as WeaponSystemData).weaponSubtype)
          : { subcategoryId: WEAPON_SUBCATEGORY.OTHER_WEAPON_SUBCATEGORY, subcategoryLabel: localize(SUBCATEGORY_LABELS[WEAPON_SUBCATEGORY.OTHER_WEAPON_SUBCATEGORY]) };
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
      });
  });

  const getRowItem = (row: InventoryRow): PHYSICAL_ITEMS => (row).item as PHYSICAL_ITEMS;
  const getRowTypeLabel = (row: InventoryRow): string => (row).typeLabel;
  const getRowQuantity = (row: InventoryRow): number => (row).quantity;
  const getRowWeightDisplay = (row: InventoryRow): string => (row).weightDisplay;
  const isContainerContentsRow = (row: InventoryRow): boolean => {
    return isContainerRow(row)
      && isContainerExpanded(getRowItem(row).id);
  };
  const getContainerExpandTitle = (row: InventoryRow): string => {
    return isContainerExpanded(getRowItem(row).id)
      ? localize('dnd35e.CONTAINER.action.collapse')
      : localize('dnd35e.CONTAINER.action.expand');
  };

  const isEquippable = (item: PHYSICAL_ITEMS): item is EQUIPPABLE_ITEMS => {
    const data = item.system as InventoryItemData | undefined;
    return (
      !!data
      && Array.isArray(data.equippedSlotIds)
      && item instanceof EquippableItem
      && typeof item.performEquip === 'function'
      && typeof item.performUnequip === 'function'
    );
  };

  const isWeapon = (item: PHYSICAL_ITEMS): item is Weapon => {
    return item.type === 'weapon';
  };

  const isItemEquipped = (item: PHYSICAL_ITEMS): boolean => {
    return isEquippable(item) && (item.system.isEquipped ?? false);
  };

  const getEquipToggleTitle = (item: PHYSICAL_ITEMS): string => {
    return isItemEquipped(item)
      ? 'dnd35e.ACTOR.inventory.action.unequip'
      : 'dnd35e.ACTOR.inventory.action.equip';
  };

  const equippableItems = computed<EquippableItem[]>(() => {
    return sourceItems.value.filter(isEquippable);
  });

  const equipItemToSlots = async (item: EquippableItem, slots: EquipSlot[]): Promise<void> => {
    if (
      item.system.equippedSlotIds?.length === slots.length
      && item.system.equippedSlotIds?.every((slot) => slots.includes(slot))
    ) {
      // Already equipped to the requested slots; no action needed.
      return;
    }
    
    const conflictingItems = equippableItems.value.filter((other) => {
      if (other.id === item.id) return false;
      const otherSlots =  other.system.equippedSlotIds ?? [];
      return otherSlots.some(slot => slots.includes(slot));
    });

    for (const conflictingItem of conflictingItems) {
      await conflictingItem.performUnequip?.();
    }

    await item.performEquip?.(slots);
  };

  const toggleEquipped = async (item: EQUIPPABLE_ITEMS): Promise<void> => {
    if (!isEquippable(item)) return;

    if (isItemEquipped(item)) {
      await item.performUnequip?.();
      return;
    }

    await equipItemToSlots(item, item.defaultSlotIds);
  };

  const FALLBACK_ITEM_ICON = '/icons/svg/item-bag.svg';

  const getItemIcon = (item: PHYSICAL_ITEMS): string => {
    return  item.img ?? FALLBACK_ITEM_ICON;
  };

  const getIconKey = (item: PHYSICAL_ITEMS): string => {
    return `${item.id}:${item.img || 'fallback'}`;
  };

  const resolveWeaponSubcategory = (weaponSubtype: WeaponSubtype | undefined): {
    subcategoryId: WeaponSubcategory;
    subcategoryLabel: string;
  } => {
    switch (weaponSubtype) {
    case WEAPON_SUBTYPE.UNARMED_WEAPON:
      return {
        subcategoryId: WEAPON_SUBCATEGORY.UNARMED_WEAPON_SUBCATEGORY,
        subcategoryLabel: localize(SUBCATEGORY_LABELS[WEAPON_SUBCATEGORY.UNARMED_WEAPON_SUBCATEGORY]),
      };
    case WEAPON_SUBTYPE.RANGED_WEAPON:
      return {
        subcategoryId: WEAPON_SUBCATEGORY.RANGED_WEAPON_SUBCATEGORY,
        subcategoryLabel: localize(SUBCATEGORY_LABELS[WEAPON_SUBCATEGORY.RANGED_WEAPON_SUBCATEGORY]),
      };
    case WEAPON_SUBTYPE.TWO_HANDED_WEAPON:
      return {
        subcategoryId: WEAPON_SUBCATEGORY.TWO_HANDED_WEAPON_SUBCATEGORY,
        subcategoryLabel: localize(SUBCATEGORY_LABELS[WEAPON_SUBCATEGORY.TWO_HANDED_WEAPON_SUBCATEGORY]),
      };
    case WEAPON_SUBTYPE.ONE_HANDED_WEAPON:
    case WEAPON_SUBTYPE.LIGHT_WEAPON:
      return {
        subcategoryId: WEAPON_SUBCATEGORY.MAIN_OR_OFF_WEAPON_SUBCATEGORY,
        subcategoryLabel: localize(SUBCATEGORY_LABELS[WEAPON_SUBCATEGORY.MAIN_OR_OFF_WEAPON_SUBCATEGORY]),
      };
    default:
      return {
        subcategoryId: WEAPON_SUBCATEGORY.OTHER_WEAPON_SUBCATEGORY,
        subcategoryLabel: localize(SUBCATEGORY_LABELS[WEAPON_SUBCATEGORY.OTHER_WEAPON_SUBCATEGORY]),
      };
    }
  };

  const toggleCarried = async (item: PHYSICAL_ITEMS): Promise<void> => {
    const itemData = item.system as InventoryItemData;
    const nextState = !(itemData.isCarried ?? false);
    await item.update({ 'system.isCarried': nextState });
  };

  const destroyItem = async (item: PHYSICAL_ITEMS): Promise<void> => {
    const itemName = item.name;
    const confirmMessage = localize('dnd35e.ACTOR.inventory.confirm.destroyItem')
      .replace('{itemName}', itemName);
    if (!window.confirm(confirmMessage)) return;
    
    await item.delete();
  };

  const removeFromContainer = async (item: PHYSICAL_ITEMS): Promise<void> => {
    await syncContainmentAe(item, null);
    // await item.update({ 'system.containerUuid': null });
  };

  /**
   * Returns the container UUID for a row item if it is a container, else undefined.
   * Used to set data-container-uuid on rows so they can receive drops.
   */
  const getRowContainerUuid = (row: InventoryRow): string | undefined => {
    const item = getRowItem(row);
    return item.type === containerItemType ? item.uuid : undefined;
  };

  // ── Container inline expansion ──────────────────────────────────────────
  const expandedContainerIds = reactive(new Set<string>());

  const isContainerRow = (row: InventoryRow): boolean =>
    getRowItem(row).type === containerItemType;

  const isContainerExpanded = (id: string): boolean =>
    expandedContainerIds.has(id);

  const toggleContainerExpand = (id: string): void => {
    if (expandedContainerIds.has(id)) {
      expandedContainerIds.delete(id);
    } else {
      expandedContainerIds.add(id);
    }
  };

  const isContainerDescendantOf = (maybeDescendantUuid: string, ancestorUuid: string): boolean => {
    const visited = new Set<string>();
    let currentUuid: string | undefined = maybeDescendantUuid;

    while (currentUuid) {
      if (currentUuid === ancestorUuid) return true;
      if (visited.has(currentUuid)) return false;
      visited.add(currentUuid);

      const currentItem = sourceItems.value.find((item) => item.uuid === currentUuid);
      currentUuid = currentItem?.system.containerUuid ?? undefined;
    }

    return false;
  };

  /**
   * Adds a dropped item to this container (container-variant table).
   * If the container is owned by an actor the item is first ensured to be on
   * that same actor, then linked via containerUuid.
   */
  const handleContainerDrop = async (dropped: PHYSICAL_ITEMS): Promise<void> => {
    const containerUuid = props.containerUuid;
    if (!containerUuid) {
      console.error('[inventory-drop] Container variant drop received but no containerUuid prop is set.');
      return;
    }
    if (!ALLOWED_ITEM_TYPES.has(dropped.type as AllowedItemType)) return;
    if (dropped.uuid === containerUuid) return; // no self-nesting

    const container = sourceItems.value
      .find((item) => item.uuid === containerUuid) as Container | undefined;
    if (!container) {
      console.error('[inventory-drop] Container variant drop received but no container item found for containerUuid:', containerUuid);
      return;
    }

    if (
      dropped.type === containerItemType
      && isContainerDescendantOf(container.uuid, dropped.uuid)
    ) {
      console.error('[inventory-drop] Prevented cyclic container nesting.', {
        droppedUuid: dropped.uuid,
        targetContainerUuid: container.uuid,
      });
      return;
    }

    const ownerUuid = effectiveOwnerUuid.value;
    const alreadyOnOwner = ownerUuid
      ? dropped.parent?.uuid === ownerUuid
      : dropped.parent == null;

    if (
      dropped instanceof EquippableItem
      && dropped.system.isEquipped
    ) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: 'dnd35e.ACTOR.inventory.confirmUnequipTitle' },
        content: game.i18n.localize('dnd35e.ACTOR.inventory.confirmUnequipContent')
          .replace('{itemName}', dropped.name),
      });

      if (!confirmed) {
        return;
      }
      
      await dropped.performUnequip?.();
    }

    if (alreadyOnOwner) {
      await syncContainmentAe(dropped as PhysicalItemLike, container);
      if (dropped.system.isCarried !== props.isCarried) {
        await dropped.update({ 'system.isCarried': props.isCarried });
      }
      return;
    }

    if (ownerUuid) {
      const owner = await fromUuid(ownerUuid);
      if (owner instanceof Actor) {
        const data = dropped.toObject() as Record<string, unknown>;
        delete (data as { _id?: string })._id;
        data.system = {
          ...((data.system as Record<string, unknown>) ?? {}),
          isCarried: props.isCarried,
        } as Partial<PhysicalItemLike['system']>;
        const newItem = await owner.createEmbeddedDocuments('Item', [data]);
        const createdItem = newItem[0] as PhysicalItemLike;
        await syncContainmentAe(createdItem, container);
      }
    }
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

  const createDragGhost = (item: PHYSICAL_ITEMS): HTMLDivElement => {
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

  const onDragStart = (event: DragEvent, item: PHYSICAL_ITEMS): void => {
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
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const onDragEnter = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneState.depth += 1;
    dropZoneState.active = true;
  };

  const onDragLeave = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneState.depth = Math.max(0, dropZoneState.depth - 1);
    if (dropZoneState.depth === 0) {
      dropZoneState.active = false;
    }
  };

  const onDrop = async (event: DragEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneState.active = false;
    dropZoneState.depth = 0;

    const rawData = foundry.applications.ux.TextEditor.getDragEventData(event) as Record<string, unknown>;
    const type = rawData?.type;
    if (type !== 'Item') return;

    const dropped = await Item.implementation.fromDropData(rawData) as PHYSICAL_ITEMS | null;
    if (
      !(dropped instanceof Item)
      || !ALLOWED_ITEM_TYPES.has(dropped.type)
    ) return;

    // Container variant: accept drops from anywhere and stow into the container.
    if (props.variant === 'container') {
      await handleContainerDrop(dropped);
      endDragPreview();
      return;
    }

    // Carried variant: if item is dropped onto a container row, stow it there.
    if (props.variant === 'carried') {
      const containerTarget = (event.target as HTMLElement | null)?.closest('[data-container-uuid]');
      const targetContainerUuid = containerTarget?.getAttribute('data-container-uuid') ?? null;
      if (targetContainerUuid && dropped.uuid !== targetContainerUuid) {
        const targetContainer = sourceItems.value.find((item) => item.uuid === targetContainerUuid);
        await syncContainmentAe(dropped as PhysicalItemLike, targetContainer as Container);
        endDragPreview();
        return;
      }
    }

    const sameActorItem = dropped.parent?.uuid === documentUuid.value;
    if (!sameActorItem) {
      // Cross-actor drop: copy item to this actor and add to carried/stored state
      const targetActorUuid = documentUuid.value;
      
      // Check if dropping onto a container
      const containerTarget = (event.target as HTMLElement | null)?.closest('[data-container-uuid]');
      const targetContainerUuid = containerTarget?.getAttribute('data-container-uuid') ?? null;
      const targetContainer = targetContainerUuid
        ? sourceItems.value.find((item) => item.uuid === targetContainerUuid) as Container | undefined
        : undefined;
      
      if (targetActorUuid) {
        const targetActor = await fromUuid(targetActorUuid);
        if (targetActor instanceof Actor) {
          const data = dropped.toObject() as Record<string, unknown>;
          delete (data as { _id?: string })._id;
          data.system = {
            ...((data.system as Record<string, unknown>) ?? {}),
            isCarried: props.isCarried,
            containerUuid: null,
          } as Partial<PhysicalItemLike['system']>;
          const newItems = await targetActor.createEmbeddedDocuments('Item', [data]);
          const createdItem = newItems[0] as PhysicalItemLike;
          
          // If dropping onto a container, link it there
          if (targetContainer) {
            await syncContainmentAe(createdItem, targetContainer);
          }
        }
      }
      endDragPreview();
      return;
    }

    const currentContainerUuid = (dropped.system as { containerUuid?: string | null }).containerUuid;

    // If the item was in a container, pull it out regardless of drag source key.
    if (currentContainerUuid) {
      await syncContainmentAe(dropped as PhysicalItemLike, null); 
      if (dropped.system.isCarried !== props.isCarried) {
        await dropped.update({ 'system.isCarried': props.isCarried });
      }
      endDragPreview();
      return;
    }

    // Standard carried ↔ stored toggle — only for drags that originated in this list.
    const sourceIsCarried = rawData[DRAG_SOURCE_KEY];
    if (typeof sourceIsCarried !== 'boolean') {
      endDragPreview();
      return;
    }

    const droppedData = dropped.system as InventoryItemData;
    const nextIsCarried = props.isCarried;
    if ((droppedData.isCarried ?? false) !== nextIsCarried) {
      await dropped.update({ 'system.isCarried': nextIsCarried });
    }
    endDragPreview();
  };

  onBeforeUnmount(() => {
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
      align-items: center;
      display: flex;
      gap: 0.2rem;
      min-width: 8rem;
      width: 100%;
    }
  }

  .container-expand-btn {
    flex-shrink: 0;
    font-size: 0.65rem;
    padding: 0.1rem 0.2rem;
  }

  .contained-item-row {
    td {
      background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 10%, transparent);
    }

    .contained-item-cell {
      padding: 0.35rem 0.5rem 0.35rem 1.25rem;
    }

    .item-name {
      padding-left: 1.75rem;
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
