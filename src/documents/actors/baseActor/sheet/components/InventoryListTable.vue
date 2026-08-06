<template>
  <div
    class="inventory-drop-zone"
    :class="{ 'is-drop-target': dropZoneState.active, 'is-locked': !isInventoryEditable }"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div
      v-if="!isInventoryEditable"
      class="inventory-lock-badge"
      :title="localize('dnd35e.ACTOR.inventory.locked')"
    >
      <i class="fas fa-lock" />
      <span>{{ localize('dnd35e.ACTOR.inventory.locked') }}</span>
    </div>

    <CategorizedListTable
      :title="title"
      :column-count="8"
      :column-widths="COLUMN_WIDTHS"
      :compact="variant === 'container'"
      :rows="rows"
      :empty-label="emptyLabel"
      :empty-icon="emptyIcon"
      :enable-subcategory-collapse="true"
    >
      <template v-if="title" #controls>
        <FieldControls :field-path="resolvedFieldPath" />
      </template>

      <template #header>
        <tr>
          <th class="name-col">{{ localize('dnd35e.ACTOR.inventory.column.name') }}</th>
          <th class="type-col">{{ localize('dnd35e.ACTOR.inventory.column.type') }}</th>
          <th class="qty-col">{{ localize('dnd35e.ACTOR.inventory.column.quantity') }}</th>
          <th class="weight-col">{{ localize('dnd35e.ACTOR.inventory.column.weight') }}</th>
          <th class="equip-col" />
          <th class="open-col" />
          <th class="carry-col" />
          <th class="destroy-col" />
        </tr>
      </template>

      <template #row="{ row, index }">
        <InventoryItemRow
          :item="getRowItem(row)"
          :variant="variant"
          :is-carried="isCarried"
          :is-equipped="row.isEquipped"
          :toggle-title="toggleTitle"
          :owner-uuid="effectiveOwnerUuid"
          :field-path="resolvedFieldPath"
          :stripe="forcedStripe ?? (index % 2 === 0 ? 'even' : 'odd')"
          :on-drag-start="onDragStart"
        />
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
  import type { PHYSICAL_ITEMS, PhysicalItemType } from '@items/itemTypes.mjs';
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
  import FieldControls from '@vc/fields/formGroups/FieldControls.vue';
  import { computed, inject, onBeforeUnmount, reactive } from 'vue';

  import { INVENTORY_FIELD_PATH } from './inventoryFieldPath.mjs';
  import InventoryItemRow from './InventoryItemRow.vue';

  const ALLOWED_ITEM_TYPES = PHYSICAL_ITEM_TYPES;

  // Fixed column widths shared by every InventoryListTable instance (outer + nested
  // container tables) so columns line up exactly across separate <table> elements.
  const COLUMN_WIDTHS = ['auto', '7rem', '3.75rem', '3.75rem', '2rem', '2rem', '2rem', '2rem'];

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
    isEquipped: boolean;
  };

  const props = withDefaults(defineProps<{
    title?: string;
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
    /** When set, every row uses this stripe color instead of alternating (nested container contents). */
    forcedStripe?: 'even' | 'odd';
    /** Pseudo field-path used for this table's own lock/override state. Defaults to the shared inventory-section path. */
    fieldPath?: string;
  }>(), {
    toggleTitle: '',
    isCarried: false,
    variant: 'carried',
    items: undefined,
    containerUuid: undefined,
    ownerUuid: null,
    forcedStripe: undefined,
    fieldPath: undefined,
  });

  const DRAG_SOURCE_KEY = 'inventorySourceIsCarried';

  const localize = (key: string): string => game.i18n.localize(key);

  const {
    documentGetters: {
      documentUuid,
      physicalItems: injectedItems,
      getIsFieldEditable,
    },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  // Falls back to the shared section-level path when this table isn't given its own
  // (e.g. nested container tables that haven't opted into individual locking).
  const resolvedFieldPath = computed(() => props.fieldPath ?? INVENTORY_FIELD_PATH);

  // Inventory has no real schema field (it's a derived embedded-item list), so this reads
  // purely from the GM override cascade - forceEdit bypasses the edit/play mode gate since
  // adding/removing carried items is a normal play-mode action, not an authoring-only one.
  const isInventoryEditable = getIsFieldEditable(resolvedFieldPath.value, undefined, true);

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
        const { subcategoryId, subcategoryLabel } = resolveSubcategoryForItem(item);
        const subcategorySortOrder = subcategoryId && subcategoryId in SUBCATEGORY_ORDER
          ? SUBCATEGORY_ORDER[subcategoryId as WeaponSubcategory]
          : 0;
        const quantity = itemData.quantity ?? 1;
        const weight = itemData.weight ?? 0;
        const allowedType = item.type as AllowedItemType;

        return {
          id: item.id,
          categoryId: allowedType,
          categoryLabel: localize(ITEM_TYPES_LOCALIZED[allowedType]),
          subcategoryId,
          subcategoryLabel,
          sortKey: `${subcategorySortOrder}-${item.name.toLowerCase()}`,
          item,
          quantity,
          weightDisplay: `${weight}`,
          typeLabel: localize('dnd35e.WEAPON.Type.' + ((item.system as { weaponType?: string }).weaponType ?? 'simple')),
          isCarried: itemData.isCarried ?? false,
          isEquipped: (itemData as InventoryItemData).isEquipped ?? false,
        };
      });
  });

  const getRowItem = (row: InventoryRow): PHYSICAL_ITEMS => (row).item as PHYSICAL_ITEMS;

  const isWeapon = (item: PHYSICAL_ITEMS): item is Weapon => {
    return item.type === 'weapon';
  };

  type SubcategoryInfo = {
    subcategoryId?: string;
    subcategoryLabel?: string;
  };

  /**
   * Subcategory grouping is category-specific (per item type), not a single global
   * scheme: weapons split by wield type, other item types currently have no
   * subcategories at all (rendered as a flat list within their category). Extend
   * this switch as new item types (e.g. equipment) gain their own subcategory
   * schemes — do not fall back to a weapon subcategory for non-weapon types.
   */
  const resolveSubcategoryForItem = (item: PHYSICAL_ITEMS): SubcategoryInfo => {
    if (isWeapon(item)) {
      return resolveWeaponSubcategory((item.system as WeaponSystemData).weaponSubtype);
    }
    return {};
  };

  const FALLBACK_ITEM_ICON = '/icons/svg/item-bag.svg';

  const getItemIcon = (item: PHYSICAL_ITEMS): string => {
    return  item.img ?? FALLBACK_ITEM_ICON;
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
      event.dataTransfer.dropEffect = isInventoryEditable.value
        ? 'move'
        : 'none';
    }
  };

  const onDragEnter = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!isInventoryEditable.value) return;
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

    if (!isInventoryEditable.value) return;

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
  .inventory-drop-zone {
    border-radius: 0.45rem;
    position: relative;
    transition: box-shadow 0.15s ease, background-color 0.15s ease;

    &.is-drop-target {
      background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 14%, transparent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-cool-4, #9ba5a0) 65%, transparent);
    }

    &.is-locked {
      :deep(.categorized-list-section) {
        filter: grayscale(0.35);
        opacity: 0.7;
      }
    }
  }

  .inventory-lock-badge {
    align-items: center;
    background: color-mix(in srgb, var(--background, #000) 75%, transparent);
    border: 1px solid var(--color-level-warning);
    border-radius: 0.25rem;
    color: var(--color-level-warning);
    display: flex;
    font-size: 0.7rem;
    gap: 0.3rem;
    padding: 0.1rem 0.5rem;
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
    white-space: nowrap;
    z-index: 2;
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
