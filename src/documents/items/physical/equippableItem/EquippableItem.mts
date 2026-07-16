import type { DocumentConstructionContext } from '@common/_types.mjs';
import { DOCUMENT_UPDATE_TYPES } from '@constants/documentUpdateTypes.mjs';
import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import type { DocumentUpdateMetadata, DocumentUpdateOptions } from '@documents/document/DocumentDnd35e.mjs';
import type { EffectChangeDataDnd35e } from '@effects/baseActiveEffect/index.mjs';
import { isItemContained, syncContainmentAe } from '@effects/containment/logic/containmentAe.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

import type { PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import { PhysicalItem } from '../physicalItem/PhysicalItem.mjs';
import { registerEquippableEventChecks } from './events/index.mjs';
import { registerEquippableEvents } from './events/registerEquippableEvents.mjs';
import type { EquippableItemSystemData, EquippableItemSystemSource } from './index.mjs';

type EquippableItemSourceProps = {
  system: EquippableItemSystemSource;
}

type EquippableItemSource<TItemType extends ItemType = ItemType> =
  Omit<foundry.documents.ItemSource<TItemType>, 'system'>
    & PhysicalItemSourceProps
    & EquippableItemSourceProps;

interface EquipmentChangeMetadata extends DocumentUpdateMetadata {
  updateType: typeof DOCUMENT_UPDATE_TYPES.EQUIP_STATUS_UPDATE;
}

/**
 * Abstract base for all equippable items.
 * Inherits physical + identifiable behaviour from {@link PhysicalItem}.
 */
abstract class EquippableItem extends PhysicalItem {
  constructor(source: PreCreate<EquippableItemSource>, context?: DocumentConstructionContext<null>) {
    super(source as any, context);

    registerEquippableEventChecks(this);
  }

  declare system: EquippableItemSystemData;

  protected _buildEquippedEffectName (): string {
    return game.i18n.format('dnd35e.EQUIPPABLE_ITEM.equippedEffect.name', { itemName: this.name });
  }

  protected _buildEquippedChanges(): EffectChangeDataDnd35e[] {
    const changes: EffectChangeDataDnd35e[] = [];
    // to do move actions to actor on equip
    return changes;
  }

  protected async _destroyEquippedEffect(): Promise<void> {
    const equippedEffect = this.effects.find(e => e.name === this._buildEquippedEffectName());
    if (equippedEffect) {
      await this.deleteEmbeddedDocuments('ActiveEffect', [equippedEffect.id]);
    }
  }

  protected async _buildEquippedEffect(): Promise<void> {
    await this._destroyEquippedEffect();

    if (!this.system.equippedSlotIds?.length) {
      return;
    }

    await this.createEmbeddedDocuments('ActiveEffect', [{
      name: this._buildEquippedEffectName(),
      target: 'actor',
      type: 'general',
      label: this.name,
      system: {
        isHidden: true,
        target: 'actor',
        description: game.i18n.format('dnd35e.EQUIPPABLE_ITEM.equippedEffect.description', { itemName: this.name }),
        changes: this._buildEquippedChanges(),
      },
    }]);
  }

  get defaultSlotIds(): EquipSlot[] {
    if (!this.system.availableEquipmentSlots?.length) {
      console.error(`Cannot equip item ${this.name} because it has no available equipment slots.`);
      return [];
    }
    return [this.system.availableEquipmentSlots[0]];
  }

  async performEquip(slotIds?: EquipSlot[], equipMetadata?: Partial<EquipmentChangeMetadata>): Promise<boolean> {
    if (!slotIds) {
      slotIds = this.defaultSlotIds;
    }
    else if (!slotIds.every(slotId => this.system.availableEquipmentSlots?.includes(slotId))) {
      console.warn(`Cannot equip item ${this.name} because one or more of the provided slotIds are not available for this item.`);
      return false;
    }

    const updateObj: Record<string, unknown> = {
      'system.equippedSlotIds': slotIds,
    };
    const updateMetadata: EquipmentChangeMetadata = {
      updateType: DOCUMENT_UPDATE_TYPES.EQUIP_STATUS_UPDATE,
      sourceDocumentId: equipMetadata?.sourceDocumentId
        ?? this.parent?.id,
      sourceMessage: equipMetadata?.sourceMessage
        ?? `${game.i18n.localize('dnd35e.EQUIPPABLE_ITEM.EVENTS.itemEquipped')}: ${this.name}`,
    };
    await this._buildEquippedEffect();
    if (isItemContained(this)) {
      await syncContainmentAe(this, null);
    }
    await this.update(updateObj, { updateMetadata });

    return true;
  }

  async performUnequip(equipMetadata?: Partial<EquipmentChangeMetadata>): Promise<boolean> {
    const updateObj: Record<string, unknown> = {
      'system.equippedSlotIds': [],
    };
    const updateMetadata: EquipmentChangeMetadata = {
      updateType: DOCUMENT_UPDATE_TYPES.EQUIP_STATUS_UPDATE,
      sourceDocumentId: equipMetadata?.sourceDocumentId
        ?? this.parent?.id,
      sourceMessage: equipMetadata?.sourceMessage
        ?? `${game.i18n.localize('dnd35e.EQUIPPABLE_ITEM.EVENTS.itemUnequipped')}: ${this.name}`,
    };
    await this._destroyEquippedEffect();
    await this.update(updateObj, { updateMetadata });

    return true;
  }

  override async update(
    updateData: Record<string, unknown>,
    options?: DocumentUpdateOptions
  ): Promise<this | undefined> {
    return await super.update(updateData, options);
  }

  protected override async _preUpdate (
    updateData: Record<string, unknown>,
    options: DocumentUpdateOptions,
    user: foundry.documents.BaseUser
  ): Promise<boolean | void> {
    const result = await super._preUpdate(updateData, options, user);
    if (result === false) return false;

    // ensure that equippedSlotIds is cleared if the item is no longer carried,
    // and that isCarried is set to true if equippedSlotIds is being set
    if (
      !Array.isArray(updateData['system.equippedSlotIds'])
      && updateData['system.isCarried'] === false
      && this.system.equippedSlotIds.length !== 0
    ) {
      updateData['system.equippedSlotIds'] = [];
    }
    else if (
      Array.isArray(updateData['system.equippedSlotIds'])
      && updateData['system.equippedSlotIds']?.length > 0
      && typeof updateData['system.isCarried'] !== 'boolean'
      && this.system.isCarried === false
    ) {
      updateData['system.isCarried'] = true;
    }

    return true;
  }
}

registerEquippableEvents();

type EquippableItemLike = ItemDnd35e<ItemType> & EquippableItem;

export {
  EquippableItem,
};

export type {
  EquippableItemLike,
  EquippableItemSource,
  EquippableItemSourceProps,
};
