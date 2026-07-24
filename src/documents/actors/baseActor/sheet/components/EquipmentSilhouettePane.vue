<template>
  <aside class="equipment-pane" :class="{ open: paneStore.isOpen.value }">
    <div class="equipment-pane-header">
      <h3>{{ localize('dnd35e.ACTOR.inventory.silhouette.title') }}</h3>
      <button
        type="button"
        class="field-control-btn"
        :title="localize('dnd35e.ACTOR.inventory.silhouette.action.close')"
        @click="paneStore.close()"
      >
        <i class="fas fa-xmark" />
      </button>
    </div>

    <div class="equipment-silhouette-surface">
      <div class="equipment-silhouette-art" :style="silhouetteStyle" />
      <div
        v-for="zone in slotZones"
        :key="zone.id"
        class="equipment-slot-zone"
        :class="[
          `slot-${zone.id}`,
          {
            'is-drop-target': activeDropZoneId === zone.id,
            occupied: !!getZoneOccupant(zone.id),
            'is-disabled': isZoneDisabled(zone.id),
          },
        ]"
        :data-slot="zone.id"
      >
        <div class="equipment-slot-label">{{ localize(zone.labelKey) }}</div>
        <div
          class="equipment-slot-box"
          :title="getZoneOccupant(zone.id)?.name || localize(zone.labelKey)"
          @dragenter="onDragEnter($event, zone.id)"
          @dragleave="onDragLeave($event, zone.id)"
          @dragover="onDragOver($event)"
          @drop="onDrop($event, zone)"
        >
          <template v-if="getZoneOccupant(zone.id)">
            <img
              class="equipped-item-icon"
              :src="getItemIcon(getZoneOccupant(zone.id)!)"
              :alt="getZoneOccupant(zone.id)!.name"
              loading="lazy"
              draggable="false"
              @error="onItemIconError(getZoneOccupant(zone.id)!, $event)"
            >
            <button
              v-if="shouldShowUnequipButton(zone.id)"
              type="button"
              class="field-control-btn unequip-btn"
              :title="localize('dnd35e.ACTOR.inventory.silhouette.action.unequip')"
              @click="unequipZone(zone.id)"
            >
              <i class="fas fa-xmark" />
            </button>
          </template>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import type { ActorDocumentStore } from '@actors/baseActor/sheet/index.mjs';
  import {
    type EquipmentPaneStore,
    EquipmentPaneStoreSymbol,
  } from '@actors/creature/sheet/EquipmentPaneStore.mjs';
  import {
    EQUIP_SLOTS,
    type EquipSlot,
    MAIN_HAND_EQUIP_SLOT,
    OFF_HAND_EQUIP_SLOT,
  } from '@constants/equipmentSlots.mjs';
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { ItemDnd35e } from '@items/baseItem/index.mjs';
  import { computed, inject, reactive, ref } from 'vue';

  type EquippableItemData = {
    isEquipped?: boolean;
    equippedSlotIds?: EquipSlot[];
  };

  type EquippableItemDocument = ItemDnd35e & {
    system: EquippableItemData;
    performEquip?: (slotIds: EquipSlot[]) => Promise<void> | void;
  };

  type SlotZone = {
    id: EquipSlot | 'twoHands';
    labelKey: string;
  };

  const slotZones: SlotZone[] = [
    ...EQUIP_SLOTS.map((slot) => ({
      id: slot,
      labelKey: `dnd35e.EQUIPPABLE.EquipSlot.${slot}`,
    } as SlotZone)),
    {
      id: 'twoHands',
      labelKey: 'dnd35e.ACTOR.inventory.silhouette.slot.twoHands',
    },
  ];

  const FALLBACK_ITEM_ICON = '/icons/svg/item-bag.svg';
  const failedIconSrcByItemId = reactive<Record<string, string>>({});
  const activeDropZoneId = ref<SlotZone['id'] | null>(null);
  const dropZoneDepth = reactive<Record<SlotZone['id'], number>>(
    Object.fromEntries([...EQUIP_SLOTS, 'twoHands'].map(slot => [slot, 0])) as Record<SlotZone['id'], number>
  );

  const localize = (key: string): string => game.i18n.localize(key);
  const paneStore = inject(EquipmentPaneStoreSymbol) as EquipmentPaneStore;
  const store = inject(DocumentSheetStoreSymbol) as ActorDocumentStore;
  const actorId = computed(() => store._storeUtils.document.value.id);

  const silhouetteStyle = computed(() => ({
    '--silhouette-url': `url(${new URL('../dnd35e/assets/equip_silhouette.svg', import.meta.url).href})`,
  }));

  const normalizeImgPath = (src: string): string => {
    if (!src) return '';
    if (/^(https?:|data:|blob:|\/)/i.test(src)) return src;
    return `/${src}`;
  };

  const getCanonicalItemImg = (item: ItemDnd35e): string => {
    const sourceImg = item._source?.img;
    if (typeof sourceImg === 'string' && sourceImg.length > 0) return normalizeImgPath(sourceImg);
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
    if (target) target.src = FALLBACK_ITEM_ICON;
  };

  const actorItems = computed(() => [...store._storeUtils.document.value.items]);

  const equippableItems = computed<EquippableItemDocument[]>(() => {
    return actorItems.value.filter((item) => {
      const system = item.system as EquippableItemData;
      return Array.isArray(system.equippedSlotIds);
    }) as EquippableItemDocument[];
  });

  const getEquippedSlots = (item: EquippableItemDocument): EquipSlot[] => {
    return [...(item.system.equippedSlotIds ?? [])];
  };

  const getZoneOccupant = (zoneId: SlotZone['id']): EquippableItemDocument | null => {
    if (zoneId === 'twoHands') {
      return equippableItems.value.find((item) => {
        const equippedSlots = getEquippedSlots(item);
        return equippedSlots.includes(MAIN_HAND_EQUIP_SLOT) && equippedSlots.includes(OFF_HAND_EQUIP_SLOT);
      }) ?? null;
    }
    return equippableItems.value.find(item => getEquippedSlots(item).includes(zoneId)) ?? null;
  };

  const isHandZone = (zoneId: SlotZone['id']): zoneId is EquipSlot => {
    return zoneId === MAIN_HAND_EQUIP_SLOT || zoneId === OFF_HAND_EQUIP_SLOT;
  };

  const isZoneDisabled = (zoneId: SlotZone['id']): boolean => {
    if (!isHandZone(zoneId)) return false;
    return getZoneOccupant('twoHands') !== null;
  };

  const shouldShowUnequipButton = (zoneId: SlotZone['id']): boolean => {
    if (!getZoneOccupant(zoneId)) return false;
    return !isZoneDisabled(zoneId);
  };

  const onDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  };

  const onDragEnter = (event: DragEvent, zoneId: SlotZone['id']): void => {
    event.preventDefault();
    dropZoneDepth[zoneId] += 1;
    activeDropZoneId.value = zoneId;
  };

  const onDragLeave = (event: DragEvent, zoneId: SlotZone['id']): void => {
    event.preventDefault();
    dropZoneDepth[zoneId] = Math.max(0, dropZoneDepth[zoneId] - 1);
    if (dropZoneDepth[zoneId] === 0 && activeDropZoneId.value === zoneId) {
      activeDropZoneId.value = null;
    }
  };

  const isEquippableItemDocument = (item: Item): item is EquippableItemDocument => {
    const system = item.system as Partial<EquippableItemData> | undefined;
    return !!system && Array.isArray(system.equippedSlotIds);
  };

  const isHandSlot = (slot: EquipSlot): boolean => {
    return slot === MAIN_HAND_EQUIP_SLOT || slot === OFF_HAND_EQUIP_SLOT;
  };

  const getAllowedDropSlots = (item: EquippableItemDocument): EquipSlot[] => {
    if (item.type === 'weapon') return [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT];
    return [...EQUIP_SLOTS];
  };

  const canItemDropIntoSlot = (item: EquippableItemDocument, slot: SlotZone['id']): boolean => {
    if (slot === 'twoHands') return item.type === 'weapon';
    return getAllowedDropSlots(item).includes(slot);
  };

  const getSlotsToEquipFromDrop = (item: EquippableItemDocument, slot: SlotZone['id']): EquipSlot[] => {
    if (slot === 'twoHands' && item.type === 'weapon') {
      return [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT];
    }

    const weaponSubtype = (item.system as { weaponSubtype?: string }).weaponSubtype;
    if (item.type === 'weapon' && weaponSubtype === 'twoHanded' && slot !== 'twoHands' && isHandSlot(slot)) {
      return [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT];
    }

    if (slot === 'twoHands') return [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT];
    return [slot];
  };

  const equipItemToSlots = async (item: EquippableItemDocument, slots: EquipSlot[]): Promise<void> => {
    const conflictingItems = equippableItems.value.filter(other => {
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

  const onDrop = async (event: DragEvent, zone: SlotZone): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    activeDropZoneId.value = null;
    dropZoneDepth[zone.id] = 0;

    const rawData = foundry.applications.ux.TextEditor.getDragEventData(event) as Record<string, unknown>;
    if (rawData?.type !== 'Item') return;

    const dropped = await Item.implementation.fromDropData(rawData);
    if (!(dropped instanceof Item)) return;
    if (!isEquippableItemDocument(dropped)) return;

    const parent = dropped.parent;
    if (!(parent instanceof Actor) || parent.id !== actorId.value) return;

    if (!canItemDropIntoSlot(dropped, zone.id)) return;

    const slotsToEquip = getSlotsToEquipFromDrop(dropped, zone.id);

    await equipItemToSlots(dropped, slotsToEquip);
  };

  const unequipZone = async (zoneId: SlotZone['id']): Promise<void> => {
    const occupant = getZoneOccupant(zoneId);
    if (!occupant) return;
    await occupant.update({
      'system.isEquipped': false,
      'system.equippedSlotIds': [],
    });
  };
</script>

<style scoped lang="scss">
  .equipment-pane {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 0.75rem;
    background-color: color-mix(in srgb, var(--sidebar-background, #f2ede0) 96%, transparent);
    border-right: 1px solid var(--color-tabs-border);
    transform: translateX(-108%);
    transition: transform 0.24s ease;
    z-index: 20;

    &.open {
      transform: translateX(0);
    }
  }

  .equipment-pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h3 {
      margin: 0;
      font-size: 1.1rem;
    }
  }

  .equipment-silhouette-surface {
    position: relative;
    min-height: 28rem;
  }

  .equipment-silhouette-art {
    position: absolute;
    inset: 0.5rem 0.75rem 0.75rem;
    background-color: var(--color-cool-4);
    opacity: 0.55;
    -webkit-mask-image: var(--silhouette-url);
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center top;
    mask-image: var(--silhouette-url);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center top;
    pointer-events: none;
    height: 120%;
    width: 120%;
    top: -5%;
    left: -10%;
  }

  .equipment-slot-zone {
    position: absolute;
    display: grid;
    gap: 0.25rem;
    justify-items: center;

    &.slot-mainHand {
      top: 47%;
      left: 2%;
    }

    &.slot-offHand {
      top: 47%;
      right: 4%;
    }

    &.slot-head {
      top: -4%;
      left: 34%;
    }

    &.slot-face {
      top: -4%;
      left: 52%;
    }

    &.slot-neck {
      top: 9%;
      left: 43%;
    }

    &.slot-shoulders {
      top: 9%;
      left: 20%;
    }

    &.slot-chest {
      top: 21%;
      left: 34%;
    }

    &.slot-torso {
      top: 21%;
      left: 52%;
    }

    &.slot-belt {
      top: 35%;
      left: 43%;
    }

    &.slot-wrists {
      top: 32%;
      left: 9%;
    }

    &.slot-hands {
      top: 32%;
      right: 10%;
    }

    &.slot-ring-left {
      top: 47%;
      left: 23%;
    }

    &.slot-ring-right {
      top: 47%;
      right: 22%;
    }

    &.slot-feet {
      top: 80%;
      left: 43%;
    }

    &.slot-twoHands {
      top: 61%;
      left: 2%;
    }
  }

  .equipment-slot-label {
    color: var(--color-form-label, #555);
    font-size: 0.75rem;
    font-weight: 700;
    text-align: center;
  }

  .equipment-slot-box {
    width: 2.5rem;
    min-height: 2.5rem;
    padding: 0.35rem;
    position: relative;
    display: grid;
    place-items: center;
    gap: 0.25rem;
    background: var(--color-cool-4);
    border: 2px solid var(--color-tabs-border);
    border-radius: 0.5rem;
    color: var(--color-form-label, #555);
    text-align: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }

  .equipment-slot-zone.is-drop-target .equipment-slot-box {
    background: color-mix(in srgb, var(--color-cool-4) 82%, white);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-tabs-border) 70%, transparent);
    transform: translateY(-1px);
  }

  .equipment-slot-zone.is-disabled .equipment-slot-box {
    opacity: 0.45;
    filter: grayscale(0.85);
  }

  .equipped-item-icon {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: cover;
    border-radius: 0.25rem;
  }

  .unequip-btn {
    position: absolute;
    top: -0.5rem;
    right: -0.6rem;
    padding: 0.1rem 0.2rem;
    background: inherit;
    border: inherit;
    border-radius: 50%;
    opacity: 1;
    font-size: 0.5rem;
    height: 1rem;
  }
</style>
