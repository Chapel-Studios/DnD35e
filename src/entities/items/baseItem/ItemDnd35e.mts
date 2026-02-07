import { replaceDataAttribute } from '@helpers/formulae/index.mjs';
import { LogHelper } from '@helpers/logHelper.mjs';
import { ITEM_TYPES } from '@items/index.mjs';
import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { DocumentConstructionContext } from '@common/_types.mjs';
import type { ItemType } from '@items/index.mjs';
import type { ItemSheetDnd35e, ItemSystemData, ItemSystemSource } from './index.mjs';
import { VueItemSheet } from '@vc/VueApplication.mjs';

type ItemSourceDnd35e<TItemType extends ItemType = ItemType> = foundry.documents.ItemSource<TItemType, ItemSystemSource>;

class ItemDnd35e<TItemType extends ItemType = ItemType> extends foundry.documents.Item {
  declare type: TItemType;
  declare system: ItemSystemData;
  declare _source: ItemSourceDnd35e<TItemType>;
  declare _sheet: ItemSheetDnd35e<ItemDnd35e<TItemType>> | null;


  get sheet(): ItemSheetDnd35e<ItemDnd35e<TItemType>> | null {
    if (!this._sheet) {
      const superSheet = super.sheet;
      if (!superSheet) {
        const SheetClass = this._getSheetClass() as unknown as {
          new (document: ItemDnd35e<TItemType>, options?: any): ItemSheetDnd35e<ItemDnd35e<TItemType>>;
        };
        // Only instantiate if it's a VueApplication subclass
        if (foundry.utils.isSubclass(SheetClass, VueItemSheet)) {
          this._sheet = new SheetClass(this, { editable: this.isOwner });
        }
      }
    } 

    return this._sheet;
  }

  override prepareBaseData(): void {
    super.prepareBaseData();
    // I don't actually think this is needed
    //this.system ??= this._createFreshSystemData();
  }
  // _createFreshSystemData (): ItemSystemData {
  //   return {
  //     description: { value: '' },
  //     version: CONFIG.Dnd35e.VERSION,
  //     isNameFromFormula: false,
  //     isPsionic: false,
  //     isEpic: false,
  //   };
  // }
  get localizedType (): string {
    return ITEM_TYPES[this.type]
      ?? 'D35E.Item';
  }

  get _displayName (): string {
    return this.system.isNameFromFormula
      ? replaceDataAttribute(this.system.nameFormula, this)
      : this.name;
  }

  get displayName (): string {
    return this._displayName;
  }
}

const ItemProxyDnd35e = new Proxy(ItemDnd35e, {
  construct (
    _target,
    args: [source: PreCreate<ItemSourceDnd35e>, context?: DocumentConstructionContext<ActorDnd35e | null>],
  ) {
    const [source] = args;
    const type = source?.type;
    const ItemClass = CONFIG.Dnd35e.item.documentClasses[type] as unknown as typeof ItemDnd35e;
    // const ItemClass: typeof ItemDnd35e = CONFIG.Dnd35e.item.documentClasses[type];
    if (!ItemClass) {
      LogHelper.error(`Item type ${type} does not exist or is not properly supported for ItemProxyDnd35e`);
    }
    return new ItemClass(...args);
  },
});

export { ItemDnd35e, ItemProxyDnd35e };

export type { ItemSourceDnd35e };
